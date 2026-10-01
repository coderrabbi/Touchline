# Touchline security review — 2026-10-01

## Changes applied locally
- Upgraded Next.js from 16.3.5 to 16.3.8, the September security release.
- Removed recipient email addresses and raw provider error details from authentication/email console logs. Operational event names remain.
- Environment validation reports variable names only, not input values. Disabling Node TLS certificate verification is rejected.
- Remote PostgreSQL connections now enforce sslmode=verify-full, including development against Neon. Production also requires verified TLS for loopback database connections. This does not rewrite .env or migrate data.
- Production frontend refuses a non-HTTPS API_INTERNAL_URL; existing backend checks require HTTPS frontend/backend origins. Production custom object-storage endpoints must use HTTPS.
- Added production HSTS, no-referrer, restrictive framing/object/base/form policies, and disabled camera/microphone/geolocation permissions. Browser production source maps are explicitly disabled. This is a baseline CSP, not a nonce-based script policy.
- Upload API responses expose only id and url, not storage object keys, provider metadata or owner IDs. Local new uploads use restrictive file creation permissions (Windows ACLs still control actual access).

## Existing controls reviewed
Passwords use bcrypt cost 12, not reversible encryption. Reset/verification tokens and refresh tokens are stored as hashes. Session cookies use HttpOnly, SameSite=Lax and Secure in production. Mutation routes use trusted-origin checks and authenticated mutations use CSRF checks. Server-side role checks protect administration. Private match evidence and tournament chat check participant/admin access. Images are decoded and re-encoded with size limits. Public player selectors omit email and password hashes; account email is intentionally available to its owner and authorized administrators.

## Validation
54 automated tests passed, including verified database TLS and sanitized error/log regression tests. Both app TypeScript checks and changed-file lint passed. Next.js production build passed (with an isolated placeholder HTTPS API origin; deploy builds must use the real Render origin). npm audit reported no known vulnerabilities at review time. Anonymous local requests to account, admin-access and notifications endpoints returned 401. Public tournament response did not contain the tested secret fields. A scan of tracked files and browser bundles for six configured secret values found no matches. These checks are not a complete penetration test or proof that no vulnerability exists.

## Deployment checks still required
1. Redeploy both Render and Vercel from these sources. API_INTERNAL_URL on Vercel must be the real HTTPS Render /api/v1 URL. Keep database credentials, Resend keys and JWT secrets only in backend secret settings; never NEXT_PUBLIC variables.
2. Neon documents TLS in transit and AES-256 encryption at rest: https://neon.com/security . This review did not access the Neon dashboard or validate account access controls, backup retention or encryption settings of this specific deployment.
3. Verify the upload bucket is private, blocks public access, uses provider encryption at rest, and has appropriately scoped service credentials. Evidence privacy in the API cannot protect an independently public bucket. Bucket encryption and backup policies were not inspected or changed.
4. Enable MFA for GitHub, Vercel, Render, Neon, Resend and storage-provider accounts. Restrict collaborator access. Rotate any credential previously committed or shared; this review scanned the current tracked files, not all Git history or external logs.
5. Keep provider request-body logging off. Ensure reset/verification query tokens are redacted in hosting access logs, analytics and error-reporting tools. Existing historical logs are not erased by source changes.
6. Current API rate limits are process-local. Use a shared store or platform WAF before running multiple API replicas; do not rely solely on a per-process limit.

## Encryption scope and limits
HTTPS encrypts traffic on the network; a user can still inspect data sent to their browser. Public profiles, avatars, brackets and scores are intentionally public. Database at-rest encryption protects underlying storage but authorized database users and the API can read ordinary fields such as email and chat messages. No application-level field encryption or end-to-end chat encryption was added, and existing data was not re-encrypted. Storage encryption, access control and hashing serve different purposes. Local HTTP is development-only. Development mail preview writes link-bearing messages to .local/mail and must never be enabled in production.

This review hardens the local source. It does not certify the live deployment or guarantee absolute security.
