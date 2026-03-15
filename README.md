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
| **Prompts** | Built-in prompts (e.g. `hub_help`) for Hub instructions; Cursor shows “X prompts” (Phase 13). |
| **Resources** | Built-in resources (e.g. `rs4it://registry` — JSON summary of tools/skills/plugins); Cursor shows “Y resources” (Phase 13). |

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

## Tools vs Skills (how they relate)

- **Tool** = a **single operation**. The Hub has built-in tools: `create_file`, `read_file`, `run_command`. Each tool does one thing (e.g. create one file, read one file, run one command). From the dashboard you can add **dynamic tools**: same built-in behaviour, but with a **custom name and description** (e.g. a tool named `create_readme` that still runs `create_file` under the hood).
- **Skill** = a **workflow** that runs **one or more tools in sequence**. A skill does not replace tools — it **uses** them. When you call a skill, the Hub runs step 1 (a tool), then step 2 (maybe another tool), and so on. So:
  - **One tool** = one action (e.g. create one file).
  - **One skill** = multiple actions in order (e.g. create a file, then run a command), each step being a tool (or a plugin tool).

So: **skills depend on tools**. A skill can use the same tool several times or several different tools in one workflow. The example below shows one skill that runs **two different tools** (create a file, then run a command) in a single request.

---

## Adding Tools from the Dashboard

From **Admin Panel** → **Tools** → **Create Tool** you can expose a **custom name and description** for an existing built-in tool. The dynamic tool still runs **exactly one** built-in tool (`create_file`, `read_file`, or `run_command`) via **Handler reference**.

### Form fields

| Field | What to put |
|--------|-------------|
| **Name** | Unique tool name in English, e.g. `create_readme` or `write_env_file`. This is the name Cursor will see in `tools/list`. |
| **Description** | One or two sentences for the AI: what this tool does and when to use it. |
| **Handler reference** | The built-in tool that runs when this tool is called. Must be one of: `create_file`, `read_file`, `run_command`. |
| **Input schema (JSON)** | JSON describing the tool’s parameters (same shape as the built-in tool’s schema). Parameter names must match what the handler expects. |
| **Allowed Roles** | (Optional) Who can see this tool. Empty = all roles. |
| **Enabled** | On = visible and callable; off = hidden. |

### Example: “Create README” wrapper around create_file

- **Name:** `create_readme`
- **Description:** `Creates a README.md file in the project. Use when initializing a new repo or adding project documentation.`
- **Handler reference:** `create_file`
- **Input schema (JSON):**

```json
{
  "path": { "type": "string", "description": "Path for the file, e.g. README.md or docs/README.md" },
  "content": { "type": "string", "description": "Full content of the README (markdown)." }
}
```

The built-in tools and their parameters:

- **create_file:** `path` (string), `content` (string), `encoding` (optional string).
- **read_file:** `path` (string).
- **run_command:** `command` (string), `cwd` (optional string).

---

## Adding Skills from the Dashboard

From **Admin Panel** → **Skills** → **Create Skill** you add a **workflow** that runs **one or more tools** in order. The skill appears in Cursor as `skill:<skill_name>`. Each step in the workflow is a **tool** (or a plugin tool); the same tool can be used in several steps, or different tools in sequence.

### Form fields

| Field | What to put |
|--------|-------------|
| **Name** | Unique name in English, with underscores, e.g. `bootstrap_docs` or `setup_and_install`. |
| **Description** | One or two sentences for the AI: what the skill does and when to use it. |
| **Steps** | Ordered list of steps. Each step: type **tool** or **plugin**, and **Target** = tool name (e.g. `create_file`, `run_command`, or `plugin:id:tool_name`). |
| **Input schema (JSON)** | JSON for all parameters the skill needs. The same parameters are sent to every step; each step uses the ones it needs (e.g. step 1 uses `path` and `content`, step 2 uses `command` and `cwd`). |
| **Allowed Roles** | (Optional) Who can see the skill. Empty = all roles. |
| **Enabled** | On = visible and runnable; off = hidden. |

### Complete example: one skill that uses two different tools

This example shows **one skill** that runs **two tools in sequence**: first **create_file**, then **run_command**. So one user request runs two operations.

**Goal:** A skill “create a README and then run npm install”.  
- **Step 1** uses the **create_file** tool (needs `path`, `content`).  
- **Step 2** uses the **run_command** tool (needs `command`, and optionally `cwd`).  

The skill receives one set of parameters; step 1 uses `path` and `content`, step 2 uses `command` and `cwd`.

- **Name:** `create_readme_and_install`
- **Description:** `Creates a README.md file at the given path with the given content, then runs npm install in the project. Use when bootstrapping a new repo.`
- **Steps:**  
  - Step 1: Type **tool** — Target: `create_file`  
  - Step 2: Type **tool** — Target: `run_command`
- **Input schema (JSON):** (paste as-is; step 1 uses `path` and `content`, step 2 uses `command` and `cwd`)

```json
{
  "path": { "type": "string", "description": "Path for README, e.g. README.md" },
  "content": { "type": "string", "description": "Content of the README (markdown)." },
  "command": { "type": "string", "description": "Command to run after creating the file, e.g. npm install" },
  "cwd": { "type": "string", "description": "(Optional) Working directory for the command, e.g. ." }
}
```

**What happens when the user (or AI) calls this skill:**

1. The Hub runs **step 1**: tool `create_file` with `path` and `content` → the README file is created.
2. The Hub runs **step 2**: tool `run_command` with `command` and `cwd` → e.g. `npm install` runs.

So: **one skill = two tools in sequence**. Skills depend on tools; a skill can use one tool once, the same tool several times, or several different tools (as here).

### Other examples (single-tool skills)

- **Only create_file:** Name e.g. `welcome_file`, one step Target `create_file`, input schema with `path` and `content`.
- **Only run_command:** Name e.g. `run_npm_install`, one step Target `run_command`, input schema with `command` and optional `cwd`.

From the dashboard, the same parameters are passed to every step; each tool step uses the parameters it needs (e.g. `create_file` ignores `command` and `cwd`). For workflows where each step needs a different mapping of parameters, add a skill in code under `src/skills/` and register it in `src/skills/index.ts`.

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
- When you add, remove, or disable a plugin in the Admin, the panel calls the Hub’s `POST /reload` so plugin tools appear or disappear without restarting the Hub. (Admin uses `HUB_BASE_URL` in Docker; locally it defaults to `http://localhost:3000`.)  
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
| [docs/phases/](docs/phases/) | Implementation phases 00–11 (overview, MCP, tools, skills, plugins, routing, hosting, panel, roles, auth, MCP users) |

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
| 11 | MCP user tracking (last used, panel tab) | ✅ |
| 12 | Usage tracking (invocations by entity and by user, panel tab) | ✅ |
| 13 | Prompts and resources (hub_help prompt, rs4it://registry resource) | ✅ |

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
