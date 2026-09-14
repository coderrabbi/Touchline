FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @touchline/shared
RUN DATABASE_URL=postgresql://build:build@localhost/build npm run db:generate
RUN npm run build -w @touchline/api
RUN npm prune --omit=dev
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4100
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api ./apps/api
RUN mkdir -p /app/local/mail /app/local/uploads && chown -R node:node /app/local
USER node
EXPOSE 4100
WORKDIR /app/apps/api
CMD ["node","dist/server.js"]
