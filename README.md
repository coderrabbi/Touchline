# Touchline

Full-stack eFootball tournament application retaining the approved Touchline charcoal/lime design. Matches are played inside eFootball; this application handles accounts, tournaments, fixtures, evidence, official results and progression.

## Structure

- `apps/web`: Next.js 16 App Router, React, TypeScript, Tailwind, shadcn-style Radix/CVA primitives, React Hook Form/Zod, TanStack Query, Lucide and Recharts.
- `apps/api`: separate Express 5 REST backend, TypeScript, PostgreSQL, Prisma 7, bcrypt and rotating JWT cookie sessions.
- `packages/shared`: shared Zod transport contracts and inferred types.
- `docs/ARCHITECTURE.md`: database, auth, API, routes, permissions and lifecycle decisions.
- `dist`: preserved original browser-only prototype. Its published URL is **not** the full-stack application.

## Implemented

Real registration, login/logout, current account, email verification/resend, password reset, refresh rotation/replay revocation, profile editing, backend role/status enforcement, CSRF/Origin checks, rate limiting and HTTP-only cookies.

Database-backed tournament catalog/details, administrator draft creation/editing/publishing/duplication/cancellation, registration/withdrawal and manual approval, capacity-safe registration transactions, seeding, round-robin/double-round-robin/group fixtures, knockout brackets with byes and optional third place, result submission with protected evidence, opposing-player confirmation, disputes and administrator decisions, official standings, qualification and champion progression.

Player/admin dashboards, in-app notifications and read state, announcements, moderation with reason/audit, privacy-aware evidence, local/S3 image storage abstraction and seed data. Authenticated role controls never use frontend-supplied roles.

Tournament Groups tabs include private admin-managed invite links and persistent live participant chat. Sign-up returns users to their original destination. Super admins can assign roles from Admin → Players. See `docs/COMMUNITY-AND-ACCOUNTS.md` for instructions and transport details.

## Requirements

Node 22.12+ (24 LTS recommended), npm, PostgreSQL 16+. This workspace uses a separate PostgreSQL 18 cluster at `127.0.0.1:55432`; it does not use or modify existing PostgreSQL databases. Frontend development port: **3100**. API: **4100**.

## Setup

```sh
npm install
npm run local:setup
```

`local:setup` creates private API and frontend environment files only when missing, random JWT secrets, a random database password and seed-super-admin password. Review `.env.example` for the complete contract. Never commit populated environment files.

For Windows with PostgreSQL 18 installed at its standard location:

```sh
npm run local:db:start
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

If Node cannot validate the Prisma download certificate on a managed network, use your organization's trusted CA configuration. Do not disable TLS validation. This workspace has a checksum-verified engine at `.local/schema-engine.exe`; set `PRISMA_SCHEMA_ENGINE_BINARY` to that absolute path when running Prisma locally. The file is not committed or needed on a normally configured machine.

On macOS/Linux or with an existing development PostgreSQL server, create an empty database and put its URL in `apps/api/.env`; skip `local:db:start`. Apply migrations and seed as above. The seed refuses production mode and does not reset existing accounts.

Open **http://localhost:3100**. API health: **http://localhost:4100/health**.

### Development accounts and mail

The super admin email is `jordan@touchline.example`. Its randomly generated password is stored in the ignored `.local/admin-credentials.txt` file. There is no committed default password. Two seeded admin accounts and 24 fictional player accounts use independent random passwords; use local password recovery when a seeded player identity is needed.

In development, verification/reset emails are written to the private `.local/mail` directory, not sent externally and not exposed through a public API. Open the relevant JSON file to follow its link. In production, set `EMAIL_MODE=smtp` and configure SMTP; startup refuses production without HTTPS origins and SMTP.

### Available scripts

```sh
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
npm run local:db:stop
```

Tests use PostgreSQL and create uniquely named test-only accounts/tournaments, deleting those records after each suite. Never point tests at a production database. `NODE_ENV=test` and the development email adapter are required. Critical coverage includes authentication, role enforcement, CSRF, refresh replay, reset-token single use, concurrent capacity enforcement, unofficial results, confirmation idempotency, round-robin scheduling, draws, knockout advancement and qualification.

## Authentication deployment topology

Use a **same-origin reverse proxy**: route `/api/v1/*` and `/health` to Express, and all frontend paths to Next. Configure `FRONTEND_URL` and `BACKEND_URL` to the HTTPS public origin, `NEXT_PUBLIC_API_URL=https://your-domain/api/v1`, and `API_INTERNAL_URL=http://api:4100/api/v1`. This lets the Next server verify the same host-only cookies that the Express API issues. Arbitrary unrelated frontend/API domains are not supported by this cookie configuration.

Express owns all authentication and business APIs. Next does not replace the backend. JWTs use distinct access/refresh secrets, HS256, issuer/audience, expiry and token version. Password changes and moderation revoke sessions. Profile responses omit sensitive fields. Production uploads use private S3-compatible storage and access-controlled API delivery; binary data is never stored in PostgreSQL.

## Deployment preparation

Dockerfiles and Compose provide the service boundaries and a local database. Supply environment/secrets through your host's secret manager, run migrations once before new API replicas start, then start API and frontend. Use HTTPS, managed database backups, object-storage retention and centralized logging. Do not expose the database publicly. Keep the development email adapter and seed disabled.

The existing Sites deployment is a static prototype. The requested Express/PostgreSQL stack requires suitable Node/PostgreSQL hosting and has not been deployed over that static site. Production SMTP, storage and hosting credentials must be configured before a live launch.

## Remaining release work

This is a working development implementation, not a completed production certification. Remaining refinements include broader admin scheduling/group-editing workflows, full statistical breakdowns and manual tie-break UI, cross-tab refresh coordination, distributed rate-limit storage for multiple API replicas, upload retention/scanning policies, operational monitoring/backups and a production-hosted end-to-end/security review. Database and API work is real; unsupported operations are not simulated with browser-local success messages.

The production dependency audit currently has no reported vulnerabilities. Prisma CLI's development-only transitive dependencies still have audit findings; resolve against upstream compatible releases before shipping a build toolchain to production. Only the API runtime and built frontend should be in serving images.

Photography: Christian García / Unsplash. Independent community platform; no affiliation with KONAMI or eFootball.
