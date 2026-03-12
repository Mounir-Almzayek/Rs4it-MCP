# RS4IT MCP Hub

A **unified platform** that exposes the company's capabilities to AI tools (e.g. Cursor) via the **MCP** (Model Context Protocol). A single entry point that aggregates local tools, composite skills, and external MCP plugins, with full management from a web panel and visibility control by role.

---

## Why This Project

- **Single AI layer**: One client (Cursor or others) connects to one Hub and gets all tools, skills, and plugins without spreading configuration across multiple servers.
- **MCP standard**: Compliant with [Model Context Protocol](https://modelcontextprotocol.io/) so tools work with any supporting client (stdio or HTTP).
- **Flexible deployment**: Run locally (stdio) for Cursor, or host over HTTP for multiple teams with roles and permissions.
- **No-code management**: Add tools, skills, and plugins and adjust roles from the panel without redeploying the app.

---

## What Does the Project Provide?

| Component | Description |
|-----------|-------------|
| **Atomic tools** | Simple operations: create/read file, run command, query; with workspace safety and blocklist. |
| **Skills** | Composite workflows that call tools (e.g. create a full API endpoint); exposed as tools with names `skill:<name>`. |
| **MCP plugins** | Integration of external MCP servers via NPX; their tools appear with prefix `plugin:<id>:<name>`. |
| **Roles & visibility** | Roles with inheritance (e.g. `full_stack` ← `web_engineer` + `backend_engineer`); tools filtered by the connecting role. |
| **Admin panel** | Next.js app to manage Tools, Skills, Plugins, Roles, and the permission matrix, with secure authentication. |
| **HTTP hosting** | Run the Hub as a network service (Streamable HTTP) for remote access. |

---

## Architecture and Flow

```
┌─────────────┐     MCP (stdio or HTTP)      ┌──────────────────┐
│  Cursor /   │ ◄──────────────────────────► │  RS4IT MCP Hub    │
│  AI client  │   tools/list · tools/call   │  (unified server) │
└─────────────┘                              └────────┬─────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    ▼                                 ▼                                 ▼
             ┌─────────────┐                   ┌─────────────┐                   ┌─────────────┐
             │   Tools     │                   │   Skills    │                   │   Plugins   │
             │  (local)    │                   │  (workflow) │                   │  (external) │
             └─────────────┘                   └─────────────┘                   └─────────────┘
                    │                                 │                                 │
                    └─────────────────────────────────┼─────────────────────────────────┘
                                                      ▼
                                             ┌──────────────────┐
                                             │  Admin Panel     │
                                             │  (management +   │
                                             │   roles)         │
                                             └──────────────────┘
```

- The **client** sends `initialize` then `tools/list` and `tools/call`.
- The **Hub** aggregates lists from local tools + skills (as tools) + plugin tools, and filters by role when applicable.
- The **panel** reads/writes dynamic config (tools, skills, plugins, roles) and shares files with the Hub.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Hub (core)** | Node.js 20+, TypeScript, [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) |
| **Panel** | Next.js 14, React, Tailwind CSS, TanStack Query, React Flow (role graph) |
| **Auth** | Signed session (HMAC), bcrypt for passwords |
| **Deployment** | stdio (local), Streamable HTTP (hosted), Docker Compose |

---

## Quick Start

### Requirements

- **Node.js 20.x** or newer  
- Details: [docs/requirements.md](docs/requirements.md)

### Run the Hub (local — stdio for Cursor)

```bash
npm install
npm run build
npm run start
```

Or in development:

```bash
npm run dev
```

### Run the Admin Panel

```bash
cd admin
npm install
cp .env.example .env
# Edit .env and set SESSION_SECRET (at least 16 characters)
npm run dev
```

The panel runs at **http://localhost:3001**. First time: go to `/login` and create the admin account.

### Run the Hub as HTTP Service

```bash
npm run build
npm run start:server
```

The Hub listens on port **3000**; MCP endpoint: `http://localhost:3000/mcp`.

### Run Everything with Docker

```bash
cp .env.docker.example .env
# Edit .env and set SESSION_SECRET (e.g.: openssl rand -base64 24)
docker compose up -d
```

- **Hub**: http://localhost:3000/mcp  
- **Admin**: http://localhost:3001  
Details: [docs/deployment.md](docs/deployment.md).

---

## Project Structure

```
rs4it mcp/
├── src/                    # Hub core
│   ├── server/             # Entry point (stdio + HTTP), tool aggregation and request routing
│   ├── tools/              # Atomic tools (create_file, read_file, run_command)
│   ├── skills/              # Skills registry and handlers
│   ├── plugins/             # Loading and managing external MCP plugins
│   ├── config/             # Loading config (dynamic, roles, plugins)
│   ├── types/              # Shared TypeScript types
│   └── router.ts           # tools/call routing by name
├── admin/                  # Admin panel (Next.js)
│   ├── app/                # Pages and API (login, tools, skills, roles, permissions, etc.)
│   ├── components/         # UI (layout, roles, permission matrix)
│   └── lib/                # Config access (registry, roles, credentials)
├── config/                 # Runtime config (roles.json, dynamic-registry, mcp_plugins, etc.)
├── docs/                   # Documentation and phases
│   ├── phases/             # Implementation phases 00–10
│   ├── architecture.md     # Architecture and design decisions
│   ├── deployment.md       # Hosting and Docker
│   └── admin-auth.md       # Panel authentication
└── scripts/                # Scripts (e.g. docker entrypoint)
```

---

## Documentation and Phases

| Document | Content |
|----------|---------|
| [docs/README.md](docs/README.md) | Docs index and phase order |
| [docs/requirements.md](docs/requirements.md) | Requirements and environment variables |
| [docs/architecture.md](docs/architecture.md) | Architecture, naming, roles |
| [docs/deployment.md](docs/deployment.md) | Hosting, Docker, reverse proxy |
| [docs/admin-auth.md](docs/admin-auth.md) | Panel auth and initial setup |
| [docs/phases/](docs/phases/) | Implementation phases 00–10 (overview, MCP, tools, skills, plugins, routing, hosting, panel, roles, auth) |

Phases are meant to be followed in order; each builds on the previous.

---

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| 00 | Overview and project setup | ✅ |
| 01 | MCP Server layer (stdio, initialize, tools/list, tools/call) | ✅ |
| 02 | Tool layer, workspace safety and blocklist | ✅ |
| 03 | Skills registry, skills exposed as `skill:*` tools | ✅ |
| 04 | External MCP plugins (NPX, stdio) | ✅ |
| 05 | Unified routing and naming convention | ✅ |
| 06 | Future extensions documentation | ✅ |
| 07 | Hub hosting over HTTP/SSE | ✅ |
| 08 | Admin panel (Tools, Skills, Plugins) | ✅ |
| 09 | Roles and visibility (inheritance, filter by role) | ✅ |
| 10 | Panel authentication (login, credential change) | ✅ |

---

## Screenshots

Screens from the panel UI — from [docs/screen](docs/screen).

### 1 — Dashboard

![Dashboard](docs/screen/Screenshot%202026-03-08%20155253.png)

### 2

![Screenshot 2](docs/screen/Screenshot%202026-03-08%20155312.png)

### 3

![Screenshot 3](docs/screen/Screenshot%202026-03-08%20155332.png)

### 4

![Screenshot 4](docs/screen/Screenshot%202026-03-08%20155357.png)

### 5

![Screenshot 5](docs/screen/Screenshot%202026-03-08%20155413.png)

### 6

![Screenshot 6](docs/screen/Screenshot%202026-03-08%20155427.png)

---

## After Deployment: Connecting Cursor

After hosting the Hub on a server (Docker, PM2, or Node directly), add it in **Cursor** as a custom MCP server:

1. **Cursor** → Settings (`Ctrl + ,`) → **Tools & MCP** → **Add new MCP server**
2. **Type**: `streamableHttp`
3. **URL**: Your MCP endpoint (e.g. `https://your-domain.com/mcp` or `http://your-server:3000/mcp`)
4. **Headers** (optional): `X-MCP-Role` if you use roles
5. Save and **restart Cursor** completely

For details (Cursor UI and `.cursor/mcp.json`): [docs/deployment.md — Connecting Cursor or another MCP client](docs/deployment.md#connecting-cursor-or-another-mcp-client).

---

## License and Status

- **License**: UNLICENSED (internal use per project policy).
- The project is based on the **Company MCP Platform — System Architecture** report and is updated with each phase in `docs/phases/`.
