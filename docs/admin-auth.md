# Admin Panel Authentication (current)

## What is protected

There are **two layers**:

1. **Admin Panel (Next.js)** session auth\n
   - The UI and `apps/admin/app/api/*` routes are protected by a signed session cookie.\n
   - Requires `SESSION_SECRET` (min 16 chars).\n

2. **Hub admin APIs** under `apps/backend/src/server/http-entry.ts` (`/api/*`)\n
   - Protected by `MCP_ADMIN_API_SECRET` via `x-admin-secret`.\n
   - **Fail-closed in production** (Hub will reject admin requests if the secret is missing).\n

## Required environment variables

- `SESSION_SECRET`\n
  - Used by the Admin Panel to sign/verify session cookies.\n
  - Must be set in Docker Compose (recommended) or local env.\n

- `MCP_ADMIN_API_SECRET`\n
  - Shared secret between Admin Panel and Hub.\n
  - Admin sends it as `x-admin-secret` when calling Hub `/api/*`.\n

## Rate limiting

- Admin login/setup routes are rate-limited.\n
- Hub `/api/*` routes have a global rate-limit guard.\n

## First-time setup

1. Start Admin and Hub.\n
2. Open Admin at `/login`.\n
3. Create the first admin account (setup route).\n

