import { communityRoutes } from "./routes/community.routes.js";
import { managementRoutes } from "./routes/admin-management.routes.js";
import { operationsRoutes } from "./routes/operations.routes.js";
import { uploadRoutes } from "./routes/upload.routes.js";
import { matchRoutes } from "./routes/match.routes.js";
import { tournamentRoutes } from "./routes/tournament.routes.js";
import { catalogRoutes } from "./routes/catalog.routes.js";
import express, { type RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { authRoutes } from "./routes/auth.routes.js";
import { userRoutes } from "./routes/user.routes.js";
import { trustedOrigin, requireAuth, requireRole } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errors.js";
import { AppError } from "./utils/errors.js";
const createHelmetMiddleware = helmet as unknown as () => RequestHandler;
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    next();
  });
  app.use(createHelmetMiddleware());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token"],
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use(
    "/api/v1",
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many requests. Try again shortly.",
        errors: [],
      },
    }),
  );
  app.use(trustedOrigin);
  app.use("/api/v1", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.get("/health", async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      message: "API and database are ready.",
      data: { status: "ok" },
    });
  });
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1", catalogRoutes);
  app.use("/api/v1", communityRoutes);
  app.use("/api/v1", managementRoutes);
  app.use("/api/v1", operationsRoutes);
  app.use("/api/v1", uploadRoutes);
  app.use("/api/v1", matchRoutes);
  app.use("/api/v1", tournamentRoutes);
  app.get(
    "/api/v1/admin/access",
    requireAuth,
    requireRole("ADMIN", "SUPER_ADMIN"),
    (req, res) =>
      res.json({
        success: true,
        message: "Administrator access verified.",
        data: { role: req.auth!.role },
      }),
  );
  app.use((_req, _res, next) => next(new AppError(404, "Endpoint not found.")));
  app.use(errorHandler);
  return app;
}
