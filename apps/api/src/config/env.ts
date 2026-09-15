import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  DATABASE_URL: z.string().startsWith("postgresql://"),
  JWT_ACCESS_SECRET: z.string().min(48),
  JWT_REFRESH_SECRET: z.string().min(48),
  FRONTEND_URL: z.url(),
  BACKEND_URL: z.url(),
  EMAIL_MODE: z.enum(["development", "smtp", "resend"]).default("development"),
  RESEND_API_KEY: z.string().optional(),
  DEV_INBOX_DIR: z.string().default("../../.local/mail"),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default("Touchline <noreply@example.com>"),
});
export const env = schema.parse(process.env);
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET)
  throw new Error("Access and refresh secrets must differ");
if (env.NODE_ENV === "production") {
  if (
    !env.FRONTEND_URL.startsWith("https://") ||
    !env.BACKEND_URL.startsWith("https://")
  ) {
    throw new Error("Production requires HTTPS origins");
  }

  if (env.EMAIL_MODE === "development") {
    throw new Error("Production requires an email provider");
  }

  if (env.EMAIL_MODE === "smtp" && !env.EMAIL_HOST) {
    throw new Error("SMTP requires EMAIL_HOST");
  }

  if (env.EMAIL_MODE === "resend" && !env.RESEND_API_KEY) {
    throw new Error("Resend requires RESEND_API_KEY");
  }
}
