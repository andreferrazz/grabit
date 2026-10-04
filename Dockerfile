# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM deps AS builder
COPY . .
# SvelteKit checks that every declared variable is set while it builds, but reads
# the real values when the server starts. These placeholders satisfy the check and
# are not written into the build.
RUN DATABASE_URL=postgres://build-placeholder/db \
	ORIGIN=https://build-placeholder.invalid \
	BETTER_AUTH_SECRET=build-placeholder-build-placeholder \
	SMTP_HOST=build-placeholder SMTP_PORT=587 SMTP_USER=build-placeholder \
	SMTP_PASS=build-placeholder SMTP_FROM=build-placeholder \
	npm run build

# Runtime dependencies only: what the built server leaves external, plus what
# scripts/migrate.mjs imports.
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
	PORT=3000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY package.json ./
COPY drizzle ./drizzle
COPY scripts/migrate.mjs ./scripts/migrate.mjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
# Apply pending migrations, then serve. One replica, so no two containers migrate at once.
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node build"]
