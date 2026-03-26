# Requirements (current)

## Runtime

- Node.js 20+\n
- Docker + Docker Compose (recommended for running Hub + Admin together)\n

## Key environment variables

### Admin Panel

- `SESSION_SECRET` (required)\n
  - Min 16 characters.\n

### Hub

- `MCP_ADMIN_API_SECRET` (required in production)\n
  - Protects `/api/*`.\n

- `DATABASE_URL` (required)\n
  - SQLite (default): `file:../config/rs4it.db` (relative to `apps/backend/prisma/schema.prisma`).\n

- `MCP_ALLOWED_HOSTS` (recommended when public)\n
  - Comma-separated hostnames allowed in the `Host` header.\n

- `MCP_LOGO_PATH` (optional)\n
  - If set, Hub serves this file at `GET /logo`.\n
  - If not set, Hub uses: `apps/backend/assets/rs4it-logo.webp`.\n

