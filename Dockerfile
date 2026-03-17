# -----------------------------------------------------------------------------
# RS4IT MCP Hub — Production Dockerfile (multi-stage)
# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Install all deps (devDependencies needed for tsc), then build
COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
  && rm -rf node_modules \
  && npm install --omit=dev

# -----------------------------------------------------------------------------
# Stage 2: Production (runs as non-root user "mcp")
# -----------------------------------------------------------------------------
FROM node:20-bullseye-slim AS runner

# Install runtime dependencies (Dart + gosu) and create non-root user
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    gnupg \
    wget \
    gosu \
  && wget -qO- https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && wget -qO /etc/apt/sources.list.d/dart_stable.list https://storage.googleapis.com/download.dartlang.org/linux/debian/dart_stable.list \
  && apt-get update && apt-get install -y --no-install-recommends dart \
  && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 mcp

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

# Entrypoint: seed config from defaults, then exec CMD as mcp (created here to avoid CRLF from Windows host)
RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -e' \
  'CONFIG_DIR="${CONFIG_DIR:-/app/config}"' \
  'DEFAULT_DIR="/app/config.default"' \
  'for f in roles.json dynamic-registry.json mcp_plugins.json; do' \
  '  if [ ! -f "$CONFIG_DIR/$f" ] && [ -f "$DEFAULT_DIR/$f" ]; then' \
  '    cp "$DEFAULT_DIR/$f" "$CONFIG_DIR/$f"' \
  '  fi' \
  'done' \
  'chown -R mcp:nodejs "$CONFIG_DIR" 2>/dev/null || true' \
  'exec gosu mcp "$@"' \
  > /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Health check: HTTP server must respond on /mcp (POST required for MCP; we check TCP or a simple GET)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/mcp', (r)=>process.exit(r.statusCode===405?0:1)).on('error',()=>process.exit(1))" || exit 1

CMD ["node", "dist/server/http-entry.js"]
