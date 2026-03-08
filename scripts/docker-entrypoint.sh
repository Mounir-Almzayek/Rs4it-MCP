#!/bin/sh
set -e
# Seed config from image defaults if volume is empty (first run)
CONFIG_DIR="${CONFIG_DIR:-/app/config}"
DEFAULT_DIR="/app/config.default"
for f in roles.json dynamic-registry.json mcp_plugins.json; do
  if [ ! -f "$CONFIG_DIR/$f" ] && [ -f "$DEFAULT_DIR/$f" ]; then
    cp "$DEFAULT_DIR/$f" "$CONFIG_DIR/$f"
    echo "[entrypoint] Seeded $CONFIG_DIR/$f from defaults"
  fi
done
chown -R mcp:nodejs "$CONFIG_DIR" 2>/dev/null || true
exec gosu mcp "$@"
