# Deployment (current)

## Local development (recommended)

From repo root:\n
- Backend (Hub HTTP): `npm run dev:backend:http`\n
- Admin: `npm run dev:admin`\n

## Docker Compose (recommended)

1. Ensure `.env` exists at repo root and contains:\n
   - `SESSION_SECRET`\n
   - `MCP_ADMIN_API_SECRET` (and keep Admin/HUB secrets aligned)\n
\n
2. Run:\n
```bash
docker compose up -d --build
```\n
\n
3. Access:\n
- Hub MCP: `http://localhost:3000/mcp`\n
- Hub logo: `http://localhost:3000/logo`\n
- Admin: `http://localhost:3001/login`\n

## Production notes

- Put the Hub behind TLS (reverse proxy).\n
- Set `NODE_ENV=production` and ensure `MCP_ADMIN_API_SECRET` is configured.\n
- Set `MCP_ALLOWED_HOSTS` to your public hostname(s).\n

