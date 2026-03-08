# -----------------------------------------------------------------------------
# RS4IT MCP Hub — Production Dockerfile (multi-stage)
# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (exact versions for reproducible builds)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Entrypoint runs as root to seed volume; then gosu drops to mcp for CMD
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 mcp \
  && apk add --no-cache gosu

WORKDIR /app

# Copy only what's needed from builder
COPY --from=builder --chown=mcp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=mcp:nodejs /app/dist ./dist
COPY --from=builder --chown=mcp:nodejs /app/package.json ./

# Default config for first-run seed (entrypoint copies to volume if missing)
COPY config ./config.default
RUN chown -R mcp:nodejs /app/config.default

# Config directory (mounted volume in compose)
RUN mkdir -p /app/config && chown mcp:nodejs /app/config

# Entrypoint: seed config from defaults, then exec CMD as mcp
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Health check: HTTP server must respond on /mcp (POST required for MCP; we check TCP or a simple GET)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/mcp', (r)=>process.exit(r.statusCode===405?0:1)).on('error',()=>process.exit(1))" || exit 1

CMD ["node", "dist/server/http-entry.js"]
