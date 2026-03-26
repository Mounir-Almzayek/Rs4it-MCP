## RS4IT MCP Hub

RS4IT MCP Hub is a **Model Context Protocol (MCP)** server that exposes your organization’s tools and integrations to AI clients (e.g. Cursor) through a single endpoint.

This repo is a small monorepo:

- **Backend**: `apps/backend` — Hub runtime (Streamable HTTP `/mcp`), plugin loader, Prisma/SQLite DB, admin APIs.
- **Frontend**: `apps/admin` — Next.js Admin Panel for managing tools/plugins/resources/rules/roles and observing usage.

### What this Hub provides (current)

- **Tools**
  - Built-in tools (implemented in code)
  - Dynamic tools (persisted in DB, managed via Admin)
  - Plugin tools (external MCP servers, managed via Admin)
- **Resources & Rules**
  - Built-in `rs4it://registry` summary
  - Dynamic resources/rules (DB, managed via Admin)
  - Plugin resources (proxied through the Hub)
- **Roles & visibility**
  - Roles + inheritance (DB)
  - Per-entity visibility filtering

### Removed legacy features

These are intentionally removed and should not exist in runtime/UI/docs:

- prompts
- skills
- skill-compiler

---

## Configuration model (DB-only)

All runtime configuration lives in a **SQLite database** (Prisma):

- **Source of truth**: `rs4it.db`
- **How you manage it**: Admin Panel → Hub `/api/*` (protected)

### One-time migration from legacy JSON (optional)

If you are upgrading from an older setup that used JSON config files, you can import them once.

Set:

- `MCP_LEGACY_CONFIG_DIR=/path/to/legacy/config`

If the directory contains any of these files, the Hub will import what it can **once**, then set a DB flag `AppSetting(key=migratedFromJson)` to avoid re-importing on restart:

- `roles.json`
- `dynamic-registry.json`
- `mcp_plugins.json`
- `admin-credentials.json`

---

## Quick start (Docker Compose — recommended)

### Prerequisites

- Docker Desktop (Compose v2)

### 1) Create `.env`

Copy `.env.docker.example` → `.env` and set at minimum:

- `SESSION_SECRET` (required; 16+ chars)
- `MCP_ADMIN_API_SECRET` (recommended; required in production)

### 2) Start

```bash
docker compose up -d --build
```

### 3) Open

- Admin: `http://localhost:3001/login`
- Hub MCP endpoint: `http://localhost:3000/mcp`
- Hub logo: `http://localhost:3000/logo`

---

## Local development (no Docker)

From repo root:

```bash
npm install
npm run dev:backend:http
npm run dev:admin
```

- Admin: `http://localhost:3001`
- Hub: `http://localhost:3000/mcp`

Note: local Prisma commands for the Hub live under `apps/backend` (it has its own `package.json`).

---

## Cursor integration (quick embed)

The Hub supports **browser login** at `/auth`, which stores `email` + `role` in HttpOnly cookies.

### Browser login (recommended)

1) Open `http://localhost:3000/auth`
2) Choose your role from the dropdown
3) If you choose the admin role, you must enter the **Admin Dashboard password**
4) (Optional) Enter your System2030 password once to create a stored session

Then open `/mcp` in the browser; it will use cookies (no identity headers).

### Option A) Connect to a running Hub (recommended)

- Start the Hub (Docker or local HTTP)
- In Cursor, add an MCP server with URL:
  - `http://localhost:3000/mcp`

If you deploy the Hub behind a domain, set:

- `HUB_BASE_URL=https://your-domain.com`
- `MCP_ALLOWED_HOSTS=your-domain.com`

### Option B) Local development workflow

- Run the Hub locally (`npm run dev:backend:http`)
- Point Cursor to:
  - `http://localhost:3000/mcp`

---

## Security essentials

- **Admin Panel auth** requires `SESSION_SECRET`.
- **Hub admin APIs** (`/api/*`) require header `x-admin-secret` matching `MCP_ADMIN_API_SECRET`.
  - In production (`NODE_ENV=production`) the Hub **fails closed** if `MCP_ADMIN_API_SECRET` is not set.
- Hub `/api/*` is rate-limited; System2030 session APIs redact tokens.

---

## Documentation

See [`docs/README.md`](docs/README.md) for the maintained docs set:

- `docs/admin-auth.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/security.md`
- `docs/requirements.md`

---

## License

UNLICENSED