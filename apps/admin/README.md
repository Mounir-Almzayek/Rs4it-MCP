# RS4IT MCP Hub — Admin Panel

Web UI to manage **Tools**, **External MCP Plugins**, **Resources**, **Rules**, and **Roles** without redeploying the Hub.

## Stack

- Next.js 14 (App Router), React, TypeScript
- TailwindCSS, lucide-react
- TanStack Query, Zustand, React Hook Form–ready

## Setup

```bash
cd apps/admin
npm install
```

## Run

```bash
npm run dev   # http://localhost:3001
npm run build && npm run start
```

## Config source

The Admin Panel reads/writes configuration through the Hub APIs (`/api/*`). The Hub persists configuration in the **SQLite database** (Prisma).

## Pages

- **Dashboard** — Counts and quick actions
- **Tools** — Add/edit/delete dynamic tools (name, description, input schema, handler ref)
- **MCP Plugins** — Add/edit/delete external plugins (command, args, resolved preview)
- **Registry Preview** — Read-only view of what the Hub exposes
- **System Status** — Summary and reload note

## Security

Do not expose the admin panel or its API to the public internet without authentication. Phase 09 (roles) can add proper auth.
