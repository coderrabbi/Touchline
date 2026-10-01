# Clean deployment fixes

The website keeps the existing colors and fonts. Session recovery preserves protected destinations; API authorization remains mandatory. Evidence is fetched privately into a responsive dialog, with both parties’ evidence and the dispute reason available to authorized reviewers.

## Deployment
- Render: use the native API start script (`dist/local-server.js`), production mode, HTTPS FRONTEND_URL and BACKEND_URL, Neon DATABASE_URL and DIRECT_URL, and persistent S3 storage.
- Select EMAIL_MODE=resend, configure RESEND_API_KEY and a verified EMAIL_FROM in Render. Local secrets were not modified. Resend attempts time out after 5 seconds, with one retry for transient failures using the same idempotency key. Verification resend failures return an error and existing links remain valid until used or expired. Actual inbox delivery still needs verification with the deployed credentials.
- Vercel: API_INTERNAL_URL must point to the Render URL ending in /api/v1 at build time. NEXT_PUBLIC_SITE_URL must be the public frontend URL. Redeploy after changing build environment variables.
- TRUST_PROXY_HOPS defaults to 1 in production for the Render proxy. Verify req.ip with the actual hosting chain and set this to the exact trusted hop count; never blindly trust all forwarded addresses. Development defaults to no trusted proxy.
- Docker API entry point and frontend standalone output are aligned. Standalone output is enabled only for Docker via NEXT_OUTPUT_STANDALONE=true; ordinary builds continue to support npm start. Supply API_INTERNAL_URL as a frontend Docker build argument and runtime environment variable.

## Tests
`npm test` runs database-free tests. To run integration tests, configure TEST_DATABASE_URL for a separate disposable database, apply migrations there, then run `npm run test:integration -w @touchline/api`. The integration configuration refuses the normal database and uses local test email/upload folders. Never use a live database as TEST_DATABASE_URL.

## Responsive behavior
Navigation uses a collapsible menu on phone and tablet; cards use two columns on tablet and one on phone. Tables and brackets scroll within their own containers. Evidence and account dialogs fit the viewport. Long names, messages, and labels wrap. Phones retain legible input sizes and 44px button targets.


## Latest saved changes — September 26, 2026
- Static server-rendered homepage hero, independent of API data and client JavaScript.
- Tournament feed with bounded retries, visible loading and recovery controls.
- Responsive mobile header with labeled account actions and Escape-to-close behavior.
- Centered account, tournament and evidence dialogs, with viewport-limited scrolling.
- Account and tournament cards removed immediately after successful deletion; related queries refresh automatically.
- Session recovery, private dispute evidence, Resend handling and deployment fixes are included.

All changes are in this clean project folder. They have not been pushed or deployed. Include new, untracked source files as well as modified files when publishing. Environment secrets and live database records were not modified by these fixes.
