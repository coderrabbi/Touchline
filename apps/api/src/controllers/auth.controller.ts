import type { RequestHandler, Response } from "express";
import {
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from "@touchline/shared";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import * as service from "../services/auth.service.js";
import { AppError } from "../utils/errors.js";
import { csrfFor, hashToken, verifyToken } from "../utils/tokens.js";
const isProduction = env.NODE_ENV === "production";

const cookies = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
function setSession(
  res: Response,
  session: {
    accessToken: string;
    refreshToken: string;
  },
) {
  res.cookie("tl_access", session.accessToken, {
    ...cookies,
    maxAge: 15 * 60_000,
  });

  res.cookie("tl_refresh", session.refreshToken, {
    ...cookies,
    maxAge: 7 * 86_400_000,
  });
}
function clearSession(res: Response) {
  res.clearCookie("tl_access", cookies);

  res.clearCookie("tl_refresh", cookies);
}
export const register: RequestHandler = async (req, res) => {
  const data = await service.register(registerSchema.parse(req.body));
  res.status(201).json({
    success: true,
    message: "Account created. Check your email to verify it.",
    data,
  });
};
export const login: RequestHandler = async (req, res) => {
  const result = await service.login(loginSchema.parse(req.body));
  setSession(res, result);
  res.json({
    success: true,
    message: "Welcome back.",
    data: { user: result.user, csrfToken: result.csrfToken },
  });
};
export const refresh: RequestHandler = async (req, res) => {
  const raw: unknown = req.cookies?.tl_refresh;
  if (typeof raw !== "string") throw new AppError(401, "Please log in again.");
  const result = await service.refresh(raw);
  setSession(res, result);
  res.json({
    success: true,
    message: "Session refreshed.",
    data: { csrfToken: result.csrfToken },
  });
};
export const logout: RequestHandler = async (req, res) => {
  await service.logout(
    typeof req.cookies?.tl_refresh === "string"
      ? req.cookies.tl_refresh
      : undefined,
  );
  clearSession(res);
  res.json({ success: true, message: "Logged out.", data: null });
};
export const me: RequestHandler = async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.auth!.userId },
    select: service.safeUserSelect,
  });
  res.json({
    success: true,
    message: "Current account.",
    data: { user, emailDeliveryMode: env.EMAIL_MODE },
  });
};
export const csrf: RequestHandler = async (req, res) => {
  const raw: unknown = req.cookies?.tl_refresh;
  if (typeof raw !== "string") throw new AppError(401, "Please log in.");
  const c = verifyToken(raw, "refresh");
  const session = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: true },
  });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.user.status !== "ACTIVE" ||
    session.user.tokenVersion !== c.version
  )
    throw new AppError(401, "Please log in again.");
  res.json({
    success: true,
    message: "Security token.",
    data: { csrfToken: csrfFor(c.familyId) },
  });
};
export const forgot: RequestHandler = async (req, res) => {
  await service.requestReset(emailSchema.parse(req.body).email);
  res.json({
    success: true,
    message:
      "If that account exists, a password reset link has been requested.",
    data: { deliveryMode: env.EMAIL_MODE },
  });
};
export const reset: RequestHandler = async (req, res) => {
  const input = resetPasswordSchema.parse(req.body);
  await service.resetPassword(input.token, input.password);
  clearSession(res);
  res.json({
    success: true,
    message: "Password changed. Please log in with your new password.",
    data: null,
  });
};
export const verify: RequestHandler = async (req, res) => {
  await service.verifyEmail(tokenSchema.parse(req.body).token);
  res.json({
    success: true,
    message: "Email verified. You can now log in.",
    data: null,
  });
};
export const resend: RequestHandler = async (req, res) => {
  await service.resendVerification(emailSchema.parse(req.body).email);
  res.json({
    success: true,
    message:
      "If the account needs verification, a new link has been requested.",
    data: { deliveryMode: env.EMAIL_MODE },
  });
};
