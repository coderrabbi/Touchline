import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  DATABASE_URL: z.string().startsWith("postgresql://"),
  JWT_ACCESS_SECRET: z.string().min(48),
  JWT_REFRESH_SECRET: z.string().min(48),
  FRONTEND_URL: z.url(),
  ADDITIONAL_FRONTEND_ORIGINS: z.string().default(""),
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
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Never print environment values or Zod input details on startup failure.
  throw new Error('Invalid environment configuration: ' + [...new Set(parsed.error.issues.map(issue => issue.path.join('.')))].join(', '));
}
export const env = parsed.data;
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('TLS certificate verification must remain enabled');
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET)
  throw new Error("Access and refresh secrets must differ");
if (env.NODE_ENV === "production") {
  if (process.env.S3_ENDPOINT && !process.env.S3_ENDPOINT.startsWith('https://')) throw new Error('Production object storage requires HTTPS');
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

export const allowedFrontendOrigins = [new URL(env.FRONTEND_URL).origin, ...env.ADDITIONAL_FRONTEND_ORIGINS.split(',').map(value=>value.trim()).filter(Boolean).map(value=>{
  const url=new URL(value);
  if(url.origin!==value || (url.protocol!=='https:' && !(url.protocol==='http:' && ['localhost','127.0.0.1'].includes(url.hostname)))) throw new Error('Additional frontend origins must be HTTPS or local development origins');
  return url.origin;
})];
