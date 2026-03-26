# Security (current)

## Hub admin API protection

- All Hub admin endpoints live under `/api/*`.\n
- Requests must include `x-admin-secret` matching `MCP_ADMIN_API_SECRET`.\n
- In production (`NODE_ENV=production`), missing secret fails closed.\n

## Sensitive data handling

- System2030 session tokens are **not returned** by the Hub session listing API.\n
- Avoid logging secrets: treat headers like `authorization`, `x-admin-secret`, and any tokens/passwords as sensitive.\n

## Rate limiting

- Hub `/api/*` is guarded by a global rate limit.\n
- Admin auth endpoints (`/api/auth/login`, `/api/auth/setup`) are rate-limited.\n

## Network hardening

- Prefer running behind a reverse proxy with TLS.\n
- Restrict hosts using `MCP_ALLOWED_HOSTS` when exposed publicly.\n

