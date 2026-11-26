# syntax=docker/dockerfile:1
FROM node:22-slim AS base

# --- Dependencies & native build tools (for better-sqlite3) ---
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# --- Builder ---
FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/tmp/build.db"

RUN npx prisma generate --config prisma7.config.ts
RUN npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --output prisma/init.sql
RUN npm run build

# --- Runner ---
FROM base AS runner
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy standalone Next.js output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy generated SQL schema & init script for persistent volume
COPY --from=builder --chown=nextjs:nodejs /app/prisma/init.sql ./prisma/init.sql
COPY --from=builder --chown=nextjs:nodejs /app/scripts/init-db.mjs ./scripts/init-db.mjs
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN mkdir -p /data && chown -R nextjs:nodejs /data
USER nextjs

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
