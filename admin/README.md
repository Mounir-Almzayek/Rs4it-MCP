# RS4IT MCP Hub — Admin Panel

Web UI to manage **Tools**, **Skills**, and **External MCP Plugins** without redeploying the Hub.

## Stack

- Next.js 14 (App Router), React, TypeScript
- TailwindCSS, lucide-react
- TanStack Query, Zustand, React Hook Form–ready

## Setup

```bash
cd admin
npm install
```

## Run

```bash
npm run dev   # http://localhost:3001
npm run build && npm run start
```

## Config path

The panel reads and writes the **dynamic registry** file. By default it uses:

- `../config/dynamic-registry.json` when running from the `admin/` directory (same repo)
- Or set **`MCP_DYNAMIC_CONFIG`** or **`ADMIN_REGISTRY_PATH`** to an absolute path

The Hub uses **`MCP_DYNAMIC_CONFIG`** (or `config/dynamic-registry.json` at project root) to load the same file. Ensure both point to the same path when running admin and Hub together.

## Pages

- **Dashboard** — Counts and quick actions
- **Tools** — Add/edit/delete dynamic tools (name, description, input schema, handler ref)
- **Skills** — Add/edit/delete skills and their steps (tool/plugin sequence)
- **MCP Plugins** — Add/edit/delete external plugins (command, args, resolved preview)
- **Registry Preview** — Read-only view of what the Hub exposes
- **System Status** — Summary and reload note

## Security

Do not expose the admin panel or its API to the public internet without authentication. Phase 09 (roles) can add proper auth.
