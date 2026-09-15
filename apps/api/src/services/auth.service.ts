import { assertIdentityAvailable } from "./identity.service.js";
import { transaction } from "./transaction.js";
import bcrypt from "bcrypt";
import { env } from "../config/env.js";
import { randomUUID } from "node:crypto";
import type { LoginInput, RegisterInput } from "@touchline/shared";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import {
  csrfFor,
  hashToken,
  opaqueToken,
  signToken,
  verifyToken,
} from "../utils/tokens.js";
import { sendAccountEmail } from "../utils/email.js";
import type { Prisma } from "../generated/prisma/client.js";
export const safeUserSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  status: true,
  emailVerified: true,
  createdAt: true,
  profile: true,
} satisfies Prisma.UserSelect;
const invalidCredentials = () =>
  new AppError(401, "Login identifier or password is incorrect.");
const dummyHash = bcrypt.hash("constant-time-dummy-value", 12);
export async function register(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, 12),
    token = opaqueToken();
  const user = await transaction(async (tx) => {
    await assertIdentityAvailable(tx, input.efootballUsername, [
      input.username,
      input.email,
    ]);
    const user = await tx.user.create({
      data: {
        name: input.name,
        username: input.username,
        email: input.email,
        passwordHash,
        profile: {
          create: {
            country: input.country,
            platform: input.platform,
            efootballUsername: input.efootballUsername,
          },
        },
      },
      select: safeUserSelect,
    });
    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    return user;
  });
  // Account creation is committed before SMTP; a failed delivery can be retried without duplicating an account.
  let emailDelivery: "sent" | "local_inbox" | "retry_required" =
    env.EMAIL_MODE === "development" ? "local_inbox" : "sent";
  try {
    await sendAccountEmail(user.email, "verify", token);
  } catch {
    emailDelivery = "retry_required";
  }
  return { user, emailDelivery };
}
async function issueSession(
  user: { id: string; tokenVersion: number },
  familyId = randomUUID(),
) {
  const id = randomUUID(),
    refreshToken = signToken(
      "refresh",
      user.id,
      user.tokenVersion,
      familyId,
      id,
    ),
    csrfToken = csrfFor(familyId);
  await prisma.refreshToken.create({
    data: {
      id,
      userId: user.id,
      familyId,
      tokenHash: hashToken(refreshToken),
      csrfHash: hashToken(csrfToken),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  return {
    accessToken: signToken("access", user.id, user.tokenVersion, familyId),
    refreshToken,
    csrfToken,
  };
}
export async function login(input: LoginInput) {
  const identifier = input.email.trim().toLowerCase();
  const direct = await prisma.user.findMany({
    where: { OR: [{ email: identifier }, { username: identifier }] },
    take: 2,
  });
  const matches = direct.length
    ? direct
    : await prisma.user.findMany({
        where: {
          profile: {
            efootballUsername: { equals: identifier, mode: "insensitive" },
          },
        },
        take: 2,
      });
  const user = matches.length === 1 ? matches[0] : undefined;
  const valid = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? (await dummyHash),
  );
  if (!user || !valid) throw invalidCredentials();
  if (user.status !== "ACTIVE")
    throw new AppError(
      403,
      "This account is restricted. Contact the platform administrator.",
    );
  return {
    ...(await issueSession(user)),
    user: await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: safeUserSelect,
    }),
  };
}
export async function refresh(raw: string) {
  const claims = verifyToken(raw, "refresh"),
    id = randomUUID(),
    newRaw = signToken(
      "refresh",
      claims.sub,
      claims.version,
      claims.familyId,
      id,
    );
  const result = await prisma.$transaction(async (tx) => {
    const previous = await tx.refreshToken.findUnique({
      where: { tokenHash: hashToken(raw) },
      include: { user: true },
    });
    if (
      !previous ||
      previous.familyId !== claims.familyId ||
      previous.userId !== claims.sub ||
      previous.expiresAt <= new Date()
    )
      return { invalid: true } as const;
    if (
      previous.user.status !== "ACTIVE" ||
      previous.user.tokenVersion !== claims.version
    )
      return { invalid: true } as const;
    const changed = await tx.refreshToken.updateMany({
      where: { id: previous.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById: id },
    });
    if (changed.count !== 1) {
      await tx.refreshToken.updateMany({
        where: { familyId: claims.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { reused: true } as const;
    }
    await tx.refreshToken.create({
      data: {
        id,
        userId: claims.sub,
        familyId: claims.familyId,
        tokenHash: hashToken(newRaw),
        csrfHash: hashToken(csrfFor(claims.familyId)),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    return { ok: true } as const;
  });
  if (!("ok" in result))
    throw new AppError(401, "Your session has expired. Please log in again.");
  return {
    accessToken: signToken(
      "access",
      claims.sub,
      claims.version,
      claims.familyId,
    ),
    refreshToken: newRaw,
    csrfToken: csrfFor(claims.familyId),
  };
}
export async function logout(raw: string | undefined) {
  if (!raw) return;
  try {
    const c = verifyToken(raw, "refresh");
    await prisma.refreshToken.updateMany({
      where: { familyId: c.familyId, userId: c.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
  }
}
export async function requestReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return;
  const token = opaqueToken();
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 1800000),
      },
    }),
  ]);
  try {
    await sendAccountEmail(email, "reset", token);

    console.log(`[EMAIL] Password reset email sent to ${email}`);
  } catch (error) {
    console.error("[EMAIL] Password reset failed:", error);
  }
}
export async function resetPassword(token: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.consumedAt || record.expiresAt <= new Date())
      throw new AppError(
        400,
        "This reset link is invalid or expired. Request a new link.",
      );
    const used = await tx.passwordResetToken.updateMany({
      where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (used.count !== 1)
      throw new AppError(400, "This reset link has already been used.");
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await tx.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  });
}
export async function verifyEmail(token: string) {
  await prisma.$transaction(async (tx) => {
    const record = await tx.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.consumedAt || record.expiresAt <= new Date())
      throw new AppError(400, "This verification link is invalid or expired.");
    const used = await tx.emailVerificationToken.updateMany({
      where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (used.count !== 1)
      throw new AppError(400, "This verification link has already been used.");
    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });
    await tx.emailVerificationToken.updateMany({
      where: { userId: record.userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  });
}
export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified || user.status !== "ACTIVE") return;
  const token = opaqueToken();
  await prisma.$transaction([
    prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 86400000),
      },
    }),
  ]);
  try {
    await sendAccountEmail(email, "verify", token);

    console.log(`[EMAIL] Verification email sent to ${email}`);
  } catch (error) {
    console.error("[EMAIL] Verification email failed:", error);
  }
}
