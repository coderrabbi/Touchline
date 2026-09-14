import { notificationEvents } from "../services/notification-events.js";
import { deleteAccount } from "../services/account-deletion.service.js";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireCsrf, requireRole } from "../middleware/auth.js";
import { AppError } from "../utils/errors.js";
import * as read from "../services/read.service.js";
import { transaction } from "../services/transaction.js";
export const operationsRoutes = Router(),
  admin = [requireAuth, requireRole("ADMIN", "SUPER_ADMIN")];
const notificationConnections = new Map<string, number>();

operationsRoutes.get("/notifications/stream", requireAuth, async (req, res) => {
  const userId = req.auth!.userId;

  const active = notificationConnections.get(userId) || 0;

  if (active >= 5) {
    throw new AppError(429, "Too many notification connections.");
  }

  notificationConnections.set(userId, active + 1);

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.flushHeaders();

  let closed = false;

  const sendUpdate = () => {
    if (closed) return;

    res.write(`event: notifications-changed\ndata: {}\n\n`);
  };

  const heartbeat = setInterval(() => {
    if (!closed) {
      res.write(": heartbeat\n\n");
    }
  }, 25_000);

  const cleanup = () => {
    if (closed) return;

    closed = true;

    clearInterval(heartbeat);

    notificationEvents.off(userId, sendUpdate);

    const remaining = (notificationConnections.get(userId) || 1) - 1;

    if (remaining > 0) {
      notificationConnections.set(userId, remaining);
    } else {
      notificationConnections.delete(userId);
    }
  };

  notificationEvents.on(userId, sendUpdate);

  res.on("close", cleanup);

  // Tell the frontend the stream is ready.
  res.write(`event: connected\ndata: {}\n\n`);
});
operationsRoutes.get("/tournaments/:id/data", async (req, res) =>
  res.json({
    success: true,
    message: "Competition data.",
    data: await read.tournamentData(z.uuid().parse(req.params.id)),
  }),
);
operationsRoutes.get("/dashboard", requireAuth, async (req, res) =>
  res.json({
    success: true,
    message: "Player dashboard.",
    data: await read.dashboard(req.auth!.userId),
  }),
);
operationsRoutes.get("/admin/dashboard", ...admin, async (_req, res) =>
  res.json({
    success: true,
    message: "Administrator dashboard.",
    data: await read.adminDashboard(),
  }),
);
operationsRoutes.get("/notifications", requireAuth, async (req, res) =>
  res.json({
    success: true,
    message: "Notifications.",
    data: await prisma.notification.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  }),
);
operationsRoutes.patch(
  "/notifications/read-all",
  requireAuth,
  requireCsrf,
  async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.auth!.userId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({
      success: true,
      message: "All notifications marked read.",
      data: null,
    });
  },
);
operationsRoutes.patch(
  "/notifications/:id/read",
  requireAuth,
  requireCsrf,
  async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { id: z.uuid().parse(req.params.id), userId: req.auth!.userId },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new AppError(404, "Notification not found.");
    res.json({
      success: true,
      message: "Notification marked read.",
      data: null,
    });
  },
);
operationsRoutes.post(
  "/admin/announcements",
  ...admin,
  requireCsrf,
  async (req, res) => {
    const data = z
      .object({
        title: z.string().min(3).max(120),
        message: z.string().min(10).max(5000),
        tournamentId: z.uuid().optional(),
      })
      .parse(req.body);
    const announcement = await transaction(async (tx) => {
      const a = await tx.announcement.create({
        data: { ...data, authorId: req.auth!.userId, publishedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.userId,
          action: "ANNOUNCEMENT_PUBLISHED",
          entityType: "Announcement",
          entityId: a.id,
        },
      });
      return a;
    });
    res.status(201).json({
      success: true,
      message: "Announcement published.",
      data: announcement,
    });
  },
);
operationsRoutes.patch(
  "/admin/users/:id",
  ...admin,
  requireCsrf,
  async (req, res) => {
    const target = z.uuid().parse(req.params.id),
      input = z
        .object({
          status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]).optional(),
          role: z.enum(["PLAYER", "ADMIN", "SUPER_ADMIN"]).optional(),
          reason: z.string().trim().min(10).max(1000),
        })
        .refine((v) => v.status || v.role)
        .parse(req.body);
    if (target === req.auth!.userId)
      throw new AppError(
        409,
        "You cannot change your own role or restriction.",
      );
    if (input.role && req.auth!.role !== "SUPER_ADMIN")
      throw new AppError(403, "Only super administrators can change roles.");
    await transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: target } });
      if (!user || user.deletedAt) throw new AppError(404, "User not found.");
      if (user.role === "SUPER_ADMIN")
        throw new AppError(
          403,
          "Super administrator accounts cannot be modified through this endpoint.",
        );
      await tx.user.update({
        where: { id: target },
        data: {
          role: input.role,
          status: input.status,
          restrictionReason: input.reason,
          tokenVersion: { increment: 1 },
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId: target, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.auth!.userId,
          action: "USER_MODERATED",
          entityType: "User",
          entityId: target,
          metadata: input,
        },
      });
    });
    res.json({
      success: true,
      message: "Account updated and sessions revoked.",
      data: null,
    });
  },
);
operationsRoutes.get("/admin/no-show-reports", ...admin, async (_req, res) =>
  res.json({
    success: true,
    message: "Open no-show reports.",
    data: await prisma.matchCoordination.findMany({
      where: { noShowReportedAt: { not: null }, decision: null },
      select: {
        matchId: true,
        noShowReason: true,
        match: { select: { tournament: { select: { name: true } } } },
      },
      orderBy: { noShowReportedAt: "asc" },
      take: 100,
    }),
  }),
);
operationsRoutes.get(
  "/users/me/notification-preferences",
  requireAuth,
  async (req, res) => {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.auth!.userId },
      select: { matchReminders: true },
    });
    res.json({
      success: true,
      message: "Notification preferences.",
      data: { matchReminders: profile?.matchReminders ?? true },
    });
  },
);
operationsRoutes.patch(
  "/users/me/notification-preferences",
  requireAuth,
  requireCsrf,
  async (req, res) => {
    const data = z
      .object({ matchReminders: z.boolean() })
      .strict()
      .parse(req.body);
    await prisma.profile.update({ where: { userId: req.auth!.userId }, data });
    res.json({ success: true, message: "Preferences saved.", data });
  },
);
operationsRoutes.get(
  "/users/me/identity-status",
  requireAuth,
  async (req, res) => {
    const p = await prisma.profile.findUnique({
      where: { userId: req.auth!.userId },
    });
    const count = p
      ? await prisma.profile.count({
          where: {
            efootballUsername: {
              equals: p.efootballUsername,
              mode: "insensitive",
            },
          },
        })
      : 0;
    res.json({
      success: true,
      message: "Game username status.",
      data: { requiresUpdate: count > 1 },
    });
  },
);
operationsRoutes.delete(
  "/admin/users/:id",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  requireCsrf,
  async (req, res) => {
    const input = z
      .object({
        reason: z.string().trim().min(10).max(1000),
        confirmation: z.string().min(1).max(24),
      })
      .strict()
      .parse(req.body);
    await deleteAccount(
      req.auth!.userId,
      z.uuid().parse(req.params.id),
      input.reason,
      input.confirmation,
    );
    res.json({
      success: true,
      message: "Account deleted. Anonymized match records retained.",
      data: null,
    });
  },
);
