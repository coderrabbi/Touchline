# Neon database setup

The application already uses PostgreSQL and supports Neon without replacing its database layer.

1. Create a Neon project and database in the region closest to the API hosting region.
2. In Neon's Connect dialog copy both connection strings: pooled for DATABASE_URL, direct (pooling disabled) for DIRECT_URL. Preserve the supplied SSL parameters.
3. Store these in the API hosting service's secret environment settings. For a local trial, use apps/api/.env, which is Git-ignored. Never put them in NEXT_PUBLIC variables or commit them.
4. Choose whether production starts empty or imports existing local users/tournaments before running migration or data-transfer commands. Do not run the development seed against a live production database.
5. For an empty database run npm run db:migrate from the repository; Prisma uses DIRECT_URL. The API uses DATABASE_URL through its PostgreSQL adapter. For an existing database, inspect and back it up first.
6. Restart the API and check /health. Test registration, chat, results and notifications with separate accounts.

Neon hosts database records, including chat messages. It does not host the Next.js website, Express API or uploaded image files. Those still need application hosting and S3-compatible storage. Changing the database URL does not transfer existing local data.

Current status: Prisma's CLI accepts DIRECT_URL with a local DATABASE_URL fallback. No Neon credentials have been provided, no cloud database was modified, and the local database remains selected.
