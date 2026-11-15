# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @store/shared build \
  && pnpm --filter @store/api exec prisma generate \
  && pnpm --filter @store/api build

FROM builder AS pruner
RUN CI=true pnpm prune --prod

FROM base AS runner
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000
WORKDIR /app

COPY --chown=node:node --from=pruner /app/package.json /app/pnpm-workspace.yaml ./
COPY --chown=node:node --from=pruner /app/node_modules ./node_modules
COPY --chown=node:node --from=pruner /app/packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:node --from=pruner /app/packages/shared/dist ./packages/shared/dist
COPY --chown=node:node --from=pruner /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --chown=node:node --from=pruner /app/apps/api/package.json ./apps/api/package.json
COPY --chown=node:node --from=pruner /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=pruner /app/apps/api/prisma ./apps/api/prisma
COPY --chown=node:node --from=pruner /app/apps/api/node_modules ./apps/api/node_modules

USER node
EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/health/live').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "apps/api/dist/server.js"]
