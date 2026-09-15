import * as tls from "node:tls";
import { mkdir, writeFile, readFile } from "node:fs/promises";

import { randomUUID } from "node:crypto";
import path from "node:path";
import nodemailer from "nodemailer";

import { env } from "../config/env.js";

type EmailKind = "verify" | "reset";

export async function sendAccountEmail(
  to: string,
  kind: EmailKind,
  token: string,
) {
  const url = new URL(
    kind === "verify" ? "/verify-email" : "/reset-password",
    env.FRONTEND_URL,
  );

  url.searchParams.set("token", token);

  const subject =
    kind === "verify"
      ? "Verify your Touchline account"
      : "Reset your Touchline password";

  const expires =
    kind === "verify"
      ? "This link expires in 24 hours."
      : "This link expires in 30 minutes.";

  const actionText = kind === "verify" ? "Verify Email" : "Reset Password";

  const description =
    kind === "verify"
      ? "Thanks for joining Touchline. Verify your email address to activate your account."
      : "We received a request to reset your Touchline password.";

  const text = `${subject}

${description}

Open this link:
${url.toString()}

${expires}

If you did not request this, you can safely ignore this email.`;

  const html = `
    <!DOCTYPE html>
    <html>
      <body
        style="
          margin:0;
          padding:0;
          background:#0d1117;
          font-family:Arial,sans-serif;
          color:#ffffff;
        "
      >
        <div
          style="
            max-width:600px;
            margin:0 auto;
            padding:40px 20px;
          "
        >
          <div
            style="
              background:#151a21;
              border:1px solid #2b323d;
              border-radius:16px;
              padding:32px;
            "
          >
            <div
              style="
                color:#b8f763;
                font-size:13px;
                font-weight:700;
                letter-spacing:1.5px;
                margin-bottom:14px;
              "
            >
              TOUCHLINE
            </div>

            <h1
              style="
                margin:0 0 16px;
                font-size:28px;
                color:#ffffff;
              "
            >
              ${subject}
            </h1>

            <p
              style="
                color:#b8c1cc;
                line-height:1.7;
                margin:0;
              "
            >
              ${description}
            </p>

            <div style="margin:30px 0;">
              <a
                href="${url.toString()}"
                style="
                  display:inline-block;
                  background:#b8f763;
                  color:#0d1117;
                  padding:14px 22px;
                  border-radius:8px;
                  text-decoration:none;
                  font-weight:700;
                "
              >
                ${actionText}
              </a>
            </div>

            <p
              style="
                color:#9aa5b1;
                font-size:14px;
                line-height:1.6;
              "
            >
              ${expires}
            </p>

            <p
              style="
                color:#6f7b88;
                font-size:13px;
                line-height:1.6;
                margin-top:24px;
              "
            >
              If you did not request this,
              you can safely ignore this email.
            </p>

            <p
              style="
                color:#6f7b88;
                font-size:12px;
                line-height:1.6;
                word-break:break-all;
                margin-top:24px;
              "
            >
              If the button doesn't work,
              copy and paste this link:
              <br />
              ${url.toString()}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  /*
   * DEVELOPMENT
   *
   * Saves emails locally instead of sending them.
   */
  if (env.EMAIL_MODE === "development") {
    await mkdir(env.DEV_INBOX_DIR, {
      recursive: true,
    });

    await writeFile(
      path.join(env.DEV_INBOX_DIR, `${randomUUID()}.json`),
      JSON.stringify(
        {
          to,
          subject,
          text,
          html,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      {
        mode: 0o600,
      },
    );

    console.log(`[EMAIL] ${kind} email written to local inbox for ${to}`);

    return;
  }

  /*
   * RESEND
   *
   * Uses HTTPS instead of SMTP.
   * Recommended for Render Free.
   */
  if (env.EMAIL_MODE === "resend") {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required when EMAIL_MODE=resend");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",

      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [to],
        subject,
        text,
        html,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Resend email failed (${response.status}): ${responseText}`,
      );
    }

    let emailId = "";

    try {
      const result = JSON.parse(responseText) as {
        id?: string;
      };

      emailId = result.id || "";
    } catch {
      // Response was successful,
      // so failing to parse the body
      // should not fail email delivery.
    }

    console.log(
      `[EMAIL] ${kind} email sent via Resend to ${to}${
        emailId ? ` (${emailId})` : ""
      }`,
    );

    return;
  }

  /*
   * SMTP FALLBACK
   *
   * Keep this if you want SMTP for another host.
   * Render Free should use EMAIL_MODE=resend.
   */

  const trustedCa = process.env.EMAIL_CA_FILE
    ? await readFile(process.env.EMAIL_CA_FILE, "utf8")
    : process.env.EMAIL_USE_SYSTEM_CA === "true" &&
        typeof tls.getCACertificates === "function"
      ? [
          ...tls.getCACertificates("default"),
          ...tls.getCACertificates("system"),
        ]
      : undefined;

  const transport = nodemailer.createTransport({
    host: env.EMAIL_HOST,

    port: env.EMAIL_PORT,

    secure: env.EMAIL_PORT === 465,

    requireTLS: env.EMAIL_PORT !== 465,

    tls: trustedCa
      ? {
          ca: trustedCa,
        }
      : undefined,

    auth: env.EMAIL_USER
      ? {
          user: env.EMAIL_USER,
          pass: env.EMAIL_PASSWORD,
        }
      : undefined,

    connectionTimeout: 10_000,

    socketTimeout: 15_000,
  });

  await transport.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  console.log(`[EMAIL] ${kind} email sent via SMTP to ${to}`);
}
