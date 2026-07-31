# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /app

# ─────────────────────── production deps ────────────────
FROM base AS deps
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev

# ─────────────────────── runtime image ──────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN useradd -r -u 1001 nodeusr && chown -R nodeusr:nodeusr /app
USER nodeusr

EXPOSE 3000
CMD ["node", "index.js"]
