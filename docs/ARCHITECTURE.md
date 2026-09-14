# Touchline application architecture

## Scope and design preservation
The production application replaces browser-local fixtures and simulated identity with a Next.js App Router client and independent Express REST API backed by PostgreSQL. The approved Touchline charcoal/lime design, typography, stadium hero, cards, spacing and mobile behavior are retained. The existing `dist/` prototype and its deployment are kept intact during migration; they are not the production application.

The attachment requests an incremental build. The implementation now includes the relational model, authentication, tournament management, registration, fixture generation, official results, progression and dashboards. The README distinguishes working functionality from remaining release work.

## 1. Project structure
```
apps/
  web/                   Next.js App Router / React / TypeScript
    app/                 public and protected routes
    components/ui/       reusable shadcn-style primitives
    features/auth/       React Hook Form + shared Zod forms
    lib/                 centralized REST client and server session lookup
  api/                   independent Express / TypeScript service
    prisma/              complete schema, SQL migrations and seed
    src/
      config/            validated environment and Prisma
      controllers/       HTTP/cookie/response translation
      services/          transactional domain operations
      routes/            endpoint and middleware wiring
      middleware/        authentication, RBAC, CSRF, errors, throttling
      validators/        endpoint-specific validation
      utils/             tokens, errors, adapters
      types/             request context
      app.ts             testable application factory
      server.ts          process lifecycle
packages/shared/         transport schemas and inferred TypeScript types
docs/                    architecture, API contract, delivery phases
```

## 2–3. Database architecture
PostgreSQL owns all application records. Prisma is the only application data access layer. IDs are UUIDs. Unique keys guard usernames/emails, tournament membership, standings scope, seed positions and one official result per match. Times are UTC. Monetary metadata uses Decimal; no payment handling is implemented.

Identity: User 1:1 Profile; User 1:N RefreshToken, PasswordResetToken, EmailVerificationToken. Only password hashes and hashed opaque one-time tokens are persisted. Refresh JWTs are persisted as hashes with a session family ID and expiry.

Competition: Tournament → registrations → approved participants → optional groups/members → matches/submissions → official standings/winner. A bracket match references its next match and slot; a third-place slot can reference a loser destination. Standings have an explicit non-null scope (`overall` or a group ID) to avoid PostgreSQL NULL uniqueness gaps. Achievements are definitions plus user awards.

Operations: notifications are user-owned; announcements can be global or event-specific; audit events retain the actor and entity reference without cascading historical deletion; upload metadata keeps object keys and ownership, never binary data. Email is delivered through SMTP or a private local development inbox. There is no durable delivery outbox; a failed verification delivery can be retried through the resend endpoint.

The complete executable definition is `apps/api/prisma/schema.prisma`. Domain invariants beyond foreign keys—same tournament membership, scheduled opponents, registration windows, capacity, bracket transitions—belong in transactional services and tests.

## 4. REST architecture
Version prefix: `/api/v1`. Controller → service → Prisma. Shared Zod schemas validate transport inputs. Central error handler returns `{ success:false, message, errors, requestId }`; success returns `{ success:true, message, data }`. Paginated resources additionally return `{ pagination:{ page,limit,total,totalPages } }`, with limits capped at 100. Public responses explicitly select safe fields. No password hashes, session tokens or private evidence metadata are returned in user payloads.

Implemented resource groups include authentication, users, tournaments, participants, fixtures, results, standings, notifications, announcements and admin/audit. Competition read models include groups, brackets and statistics derived from official results. Draft/private event access is enforced server-side.

## 5. Authentication and authorization
Register → bcrypt password hash → PLAYER role assigned on server → email verification token → login → short-lived access JWT and rotating refresh JWT in HTTP-only cookies. Both JWT types use separate secrets, explicit algorithm/issuer/audience, subject, expiry and unique ID. Tokens are never stored in localStorage. Cookies are Secure in production and SameSite=Lax; deployments must use same-site frontend/API origins. Browser mutations require an exact trusted Origin plus a session-bound CSRF token sent in `X-CSRF-Token`. Pre-login mutations require trusted Origin. CORS permits only the configured frontend.

Refresh sessions rotate transactionally. Reuse of a consumed refresh token revokes its entire family; expired/revoked tokens fail. Logout revokes the family and clears cookies. Password reset consumes a single-use hashed token transactionally, changes the bcrypt hash, revokes all sessions, and increments tokenVersion. Every authenticated request loads the current account status/role/tokenVersion from PostgreSQL, so suspension, bans and password changes invalidate existing access. Refresh rotation is serialized by the client; applications with many tabs should add cross-tab coordination before launch.

Forgot-password and verification requests avoid email-existence disclosure. Rate limits protect login, registration and token endpoints. Tokens are cryptographically random, short-lived, hashed at rest and never logged. Production email delivery uses SMTP; local development uses a private development inbox outside public routes. Next server-side protected layouts call Express `/auth/me`; Express remains the authority. Frontend role gates are UX only. No production demo role switcher exists.

## 6. Tournament state architecture
Tournament: DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → UPCOMING → ONGOING → COMPLETED; active states may transition to CANCELLED through an audited admin action. Publishing validates format, dates, player limits and rules. Reopening registration requires no generated competitive state or an explicit audited rollback policy.

Registration: PENDING → APPROVED/REJECTED; PENDING/APPROVED → WITHDRAWN before the allowed deadline. Capacity is protected by a serializable transaction and retry on write conflict, not a read-then-insert race.

Match: SCHEDULED → LIVE → RESULT_SUBMITTED → COMPLETED, or RESULT_SUBMITTED → DISPUTED → COMPLETED via admin decision. CANCELLED/WALKOVER are audited administrative outcomes. Only the opponent can confirm another player's submission. A draw is valid in league/group play; knockout ties require a deciding penalty/winner field. Completed results cannot be silently overwritten after downstream play.

Completion transaction: validate version/current state → official score → recompute affected standings from official matches (idempotent) → populate next slot → champion/tournament completion if final → notifications → audit. Group qualification waits for every required official result, applies configured tie-breaks, records unresolved/manual ties, and optionally waits for admin review. Pairings never duplicate a player in a round; odd entrants have byes. Double round robin reverses home/away legs.

## 7. Frontend routes
Public: `/`, `/tournaments`, `/tournaments/[slug]` (with competition tabs), `/players/[username]`.
Auth: `/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`.
Player: `/dashboard`, `/dashboard/{tournaments,matches,notifications,profile,settings}`.
Admin: `/admin`, `/admin/tournaments`, `/admin/tournaments/create`, `/admin/tournaments/[id]` (editing and participant management), `/admin/{players,registrations,matches,disputes,announcements,statistics,audit}`.
Only implemented routes are linked as functional in each phase. Loading, error, empty and forbidden states are real request outcomes. React Query handles server state; RHF/Zod forms handle editable input. Zustand is unnecessary for this milestone.

## 8–10. Packages and environment
Web: next, react, react-dom, tailwindcss, @tailwindcss/postcss, react-hook-form, @hookform/resolvers, zod, @tanstack/react-query, lucide-react, recharts, class-variance-authority, clsx, tailwind-merge, @radix-ui/react-slot. API: express, @prisma/client, @prisma/adapter-pg, pg, zod, bcrypt, jsonwebtoken, cookie-parser, cors, helmet, express-rate-limit, nodemailer, dotenv. Tooling: TypeScript, tsx, Prisma CLI, Vitest, Supertest, ESLint, concurrently. Exact resolved versions are committed in the npm lockfile.

Environment contracts live in `.env.example`. Database and JWT/SMTP/storage secrets are API-only. `NEXT_PUBLIC_API_URL` is intentionally public; `API_INTERNAL_URL` is server-only. Credentials are generated locally and excluded from Git. Separate origin, SMTP and object-storage configuration is required before production deployment. Sites' existing static hosting does not provide the requested long-running Express/PostgreSQL architecture; deploy the services on appropriate Node/PostgreSQL infrastructure without silently replacing the requested stack.

## Delivery gates
Phase 1: schema validates, migration applies to isolated PostgreSQL, Prisma generates, all packages typecheck.
Phase 2: real HTTP authentication/profile flows and adversarial permission/replay tests pass against PostgreSQL, frontend production build passes, design compared against the existing prototype.
Phases 3–9: tournament CRUD/registration; groups/fixtures; results/standings; knockout progression; dashboards/notifications; statistics/audit; security/load/accessibility/deployment. See README for actual implemented versus planned functionality; architecture alone is not a production readiness claim.

References checked during implementation: https://nextjs.org/docs/app/getting-started/installation and https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7 .
