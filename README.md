## RS4IT MCP Hub

A **unified AI integration hub** that exposes the company’s capabilities to AI tools (such as Cursor) via the **Model Context Protocol (MCP)**.  
It acts as a **single entry point** that aggregates:

- Local **atomic tools**
- Orchestrated **skills**
- External **MCP plugins**

All of this is managed from a web **Admin Panel** with **role‑based visibility and permissions**.

> This README describes the **current version** of the Hub and how to install, configure, and use it with Cursor.

---

### Table of Contents

1. [Why This Project](#why-this-project)  
2. [Main Features](#main-features)  
3. [Architecture & Data Flow](#architecture--data-flow)  
4. [Core Concepts: Tools, Skills, Plugins, Prompts, Resources & Roles](#core-concepts-tools-skills-plugins-prompts-resources--roles)  
5. [Configuration Files](#configuration-files)  
6. [Tech Stack](#tech-stack)  
7. [Running the Hub & Admin Panel](#running-the-hub--admin-panel)  
8. [Using the Admin Panel](#using-the-admin-panel)  
9. [Users, Usage Tracking, Prompts & Resources](#users-usage-tracking-prompts--resources)  
10. [Project Structure](#project-structure)  
11. [Documentation & Implementation Phases](#documentation--implementation-phases)  
12. [Screenshots](#screenshots)  
13. [Connecting Cursor](#connecting-cursor)  
14. [License & Project Status](#license--project-status)

---

## Why This Project

- **Single AI layer**: One client (Cursor or others) connects to **one Hub** and gets all tools, skills, and plugins without spreading configuration across multiple servers.
- **Standards-based**: Fully aligned with [Model Context Protocol](https://modelcontextprotocol.io/), so the Hub can be used by any MCP‑compatible client (stdio or HTTP).
- **Flexible deployment**: Run locally via stdio for development with Cursor, or host over HTTP for teams and production.
- **Centralized management**: Add tools, skills, and plugins and manage their visibility **from the Admin Panel** without redeploying.
- **Role‑aware**: Different roles (e.g. `full_stack`, `backend_engineer`) see different tools and skills, matching your internal access model.

---

## Main Features

- **Tools (atomic capabilities)**
  - Hardened **built‑in tools** for clearly scoped operations inside the workspace:
    - `create_file` for creating files.
    - `read_file` for reading file contents.
    - `run_command` for executing commands in a controlled environment.
  - Every tool passes through a single safety layer (workspace constraints + blocklist), so you do not need to re‑implement protection in each feature.
  - From the Admin Panel you can define **named tools** (wrappers) with intent‑driven names and descriptions that match real use cases.

- **Skills (orchestrated workflows)**
  - Skills compose Tools and Plugins into **end‑to‑end flows**:
    - One step writes a file, the next runs a command, the next calls a plugin tool, and so on.
    - All steps share the same input schema, so the AI sends a single request for the whole scenario.
  - Exposed to MCP clients as tools with names like `skill:<name>`, for example `skill:create_readme_and_install`.
  - Encourage AI agents to use **high‑level operations** instead of manually chaining low‑level steps.

- **Plugins (external MCP servers)**
  - Integrate **any external MCP server** (typically via `npx`) into the same Hub.
  - Plugin tools are surfaced under names like `plugin:<id>:<tool_name>` so the boundary between local and external capabilities is always explicit.
  - The same infrastructure also supports:
    - **Plugin prompts** under a consistent prefix.
    - **Plugin resources** under a unified URI scheme.

- **Prompts (AI guidance layer)**
  - A curated set of prompts designed to guide AI behavior when using the Hub:
    - Example: `hub_help` describes capabilities, constraints, and the most important tools/skills to prefer.
  - Prompts can be:
    - Implemented directly in the Hub code (core prompts).
    - Or managed dynamically via `dynamic-registry.json` and the Admin Panel.
  - IDEs like Cursor list these prompts as reusable building blocks, reducing onboarding for both human users and AI agents.

- **Resources (read‑only knowledge surfaces)**
  - Resources are **read‑only views** that expose snapshots of Hub knowledge:
    - Example: `rs4it://registry` returns structured JSON describing tools, skills, plugins, and additional metadata.
  - AI agents can query resources before calling tools to build an accurate mental model of what the Hub can do.
  - Resources appear in the Resources panel in Cursor, making Hub introspection easy for both humans and AI.

- **Roles & visibility**
  - Hierarchical role model with inheritance (for example, `full_stack` ← `web_engineer` + `backend_engineer`).
  - Any Tool / Skill / Plugin / Prompt / Resource can be restricted to one or more roles.
  - The Hub filters `tools/list` and other responses over HTTP/stdio based on role (for example, via the `X-MCP-Role` header).

- **Admin Panel**
  - Next.js application that provides a **single control surface** for:
    - Tools (built‑in + dynamic).
    - Skills (workflows).
    - Plugins (external MCP servers).
    - Prompts & Resources.
    - Roles, permissions, usage analytics, MCP users.
  - Uses signed sessions (HMAC) and bcrypt‑hashed passwords, with an experience tailored for administrators.

- **HTTP hosting**
  - Ability to run the Hub as a Streamable HTTP MCP server.
  - Suitable for shared environments (Docker, reverse proxy, TLS) while keeping the same MCP contract as the stdio mode.

---

## Architecture & Data Flow

```text
┌─────────────┐     MCP (stdio or HTTP)      ┌──────────────────┐
│  Cursor /   │ ◄──────────────────────────► │  RS4IT MCP Hub    │
│  AI client  │   tools/list · tools/call   │  (unified server) │
└─────────────┘                              └────────┬─────────┘
                                                     │
                    ┌────────────────────────────────┼─────────────────────────────────┐
                    ▼                                ▼                                 ▼
             ┌─────────────┐                   ┌─────────────┐                   ┌─────────────┐
             │   Tools     │                   │   Skills    │                   │   Plugins   │
             │  (local)    │                   │ (workflows) │                   │  (external) │
             └─────────────┘                   └─────────────┘                   └─────────────┘
                    │                                │                                 │
                    └────────────────────────────────┼─────────────────────────────────┘
                                                     ▼
                                            ┌──────────────────┐
                                            │   Admin Panel    │
                                            │ (management &    │
                                            │   roles)         │
                                            └──────────────────┘
```

- The **client** (Cursor or any MCP client) sends `initialize`, then `tools/list` and `tools/call`.
- The **Hub**:
  - Aggregates tools from:
    - Local built‑in tools
    - Skills (exposed as tools)
    - Plugin tools (external MCP servers)
  - Applies **role filtering** before returning `tools/list`.
- The **Admin Panel**:
  - Reads/writes dynamic configuration (tools, skills, plugins, roles).
  - Triggers Hub reloads when configuration changes.

For detailed architectural decisions and trade‑offs, see `docs/architecture.md`.

---

## Core Concepts: Tools, Skills, Plugins, Prompts, Resources & Roles

This section describes the core conceptual layer of the Hub. Everything else builds on these five entities plus the role system.

### Tools — the minimal building block

- A **Tool** is a **single, stateless, well‑defined operation** that an AI client can safely invoke.
- The default interface includes:
  - `create_file(path, content, encoding?)`
  - `read_file(path)`
  - `run_command(command, cwd?)`
- Via the Admin Panel you can create **Dynamic Tools** that:
  - Give operations meaningful names tied to real use cases (e.g. `create_readme`, `write_env_file`).
  - Provide clear descriptions for when and why an AI should use them.
  - Define explicit input schemas that map directly into MCP tool definitions.
- This keeps the execution layer small and safe, while the naming/description layer remains flexible and expressive.

### Skills — orchestration of Tools and Plugins

- A **Skill** is a **multi‑step scenario**:
  - Each step invokes a Tool or Plugin Tool.
  - All steps share the same input object.
- Skills are exposed to MCP clients as tools named `skill:<skill_name>`, for example:
  - `skill:create_readme_and_install`
- Why Skills?
  - Let AI clients ask for a **complete outcome** instead of orchestrating dozens of low‑level calls by hand.
  - Encourage reuse of the same atomic tools across many higher‑level workflows.
- Skills can be defined:
  - From the Admin Panel as declarative workflows over Dynamic Tools and Plugins.
  - In code under `src/skills/` and registered in `src/skills/index.ts` when you need more advanced input‑to‑step mapping.

### Plugins — extending the Hub beyond this repo

- The Hub can run and communicate with **external MCP servers** (typically via `npx`).
- Tools from these plugins are surfaced under names like:
  - `plugin:<pluginId>:<toolName>`
- Internally, consistent naming is enforced via constants such as:
  - `PLUGIN_TOOL_PREFIX = "plugin:"`
  - `PLUGIN_PROMPT_PREFIX = "plugin:"`
  - `PLUGIN_RESOURCE_URI_SCHEME = "plugin"`
  - `PLUGIN_SKILL_PREFIX = "skill:plugin:"`
- Plugin configuration (tools, prompts, resources) is managed through:
  - JSON in `config/mcp_plugins.json`, and/or
  - Dynamic entries in `dynamic-registry.json`
  - The Plugins sections in the Admin Panel.

### Prompts — guiding the AI behavior

- A **Prompt** in this project is a **first‑class entity**, not just a free‑form text blob:
  - Has a stable name (e.g. `hub_help`).
  - Can be restricted to specific roles.
  - Can be sourced from code or from `dynamic-registry.json`.
- Example use cases:
  - A prompt that defines how the AI should behave as a company‑specific coding assistant.
  - A prompt that explains naming conventions, safety constraints, or recommended workflows.
- IDEs such as Cursor surface these prompts as reusable templates, so both engineers and AI agents can quickly select an appropriate “mode” of operation.

### Resources — structured, read‑only knowledge

- A **Resource** is a **read‑only endpoint** that returns structured data which the AI can treat as a source of truth.
- A core example:
  - `rs4it://registry`, which returns JSON summarizing tools, skills, plugins, and potentially other metadata.
- Resources are useful when:
  - An AI needs to understand “what this Hub can do” before calling any tools.
  - You want to expose shared metadata to all users in a single, inspectable place.
- Resources are:
  - Implemented in code (the actual handlers).
  - Linked in `dynamic-registry.json` so they can be surfaced and managed from the Admin Panel.

### Roles & visibility — who sees what

- Roles connect all of the above concepts to real users:
  - Example: `full_stack` inherits from `web_engineer` and `backend_engineer`.
  - Any Tool / Skill / Plugin / Prompt / Resource can be restricted to one or more roles.
- The Hub reads the role from context (e.g. `X-MCP-Role` in HTTP mode) and then:
  - Filters `tools/list` and other responses returned to the client.
  - Applies the same logic inside the Admin Panel when displaying and managing entities.

For the step‑by‑step evolution of these concepts, see:

- `docs/phases/02-phase-tool-layer.md`
- `docs/phases/03-phase-skills-registry.md`
- `docs/phases/04-phase-external-plugins.md`
- `docs/phases/09-phase-roles-and-visibility.md`
- `docs/phases/13-phase-prompts-and-resources.md`

---

## Configuration Files

The main runtime configuration lives under `config/`:

- **`config/dynamic-registry.json`**
  - Stores dynamic definitions managed by the Admin Panel.
  - Minimal example:

    ```json
    {
      "tools": [],
      "skills": [],
      "plugins": [],
      "prompts": [],
      "resources": []
    }
    ```

  - In a real deployment this file will include:
    - Custom tools (wrapping built‑in handlers)
    - Skills (workflows)
    - Plugin references
    - Hub‑level prompts and resources

- **`config/mcp_plugins.json`**
  - Registry for external MCP plugins.

    ```json
    {
      "plugins": []
    }
    ```

  - Each plugin entry typically includes:
    - Identifier
    - Command (e.g. `npx some-mcp-plugin`)
    - Arguments and environment variables
    - Optional role restrictions

- **Other config files (examples)**
  - `config/roles.json` — Role definitions and inheritance.
  - Additional files as documented in `docs/requirements.md` and `docs/architecture.md`.

Configuration is meant to be **edited via the Admin Panel** in normal usage; direct JSON editing is for advanced/bootstrapping scenarios.

For a complete list of config files and environment variables, see:

- `docs/requirements.md`
- `docs/phases/04-phase-external-plugins.md`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Hub (core)** | Node.js 20+, TypeScript, [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) |
| **Panel** | Next.js 14, React, Tailwind CSS, TanStack Query, React Flow (role graph) |
| **Auth** | Signed session (HMAC), bcrypt for passwords |
| **Deployment** | stdio (local), Streamable HTTP (hosted), Docker Compose |

---

## Running the Hub & Admin Panel

### Requirements

- **Node.js 20.x** or newer  
- Details and environment variables: see `docs/requirements.md`

### Run the Hub locally (stdio for Cursor)

```bash
npm install
npm run build
npm run start
```

For development with hot‑reload:

```bash
npm run dev
```

### Run the Hub as an HTTP service

```bash
npm run build
npm run start:server
```

- MCP endpoint (default): `http://localhost:3000/mcp`
- Use this for Docker / remote deployments / multiple users.

### Run the Admin Panel

```bash
cd admin
npm install
cp .env.example .env
# Edit .env and set SESSION_SECRET (at least 16 characters)
npm run dev
```

- Panel URL: `http://localhost:3001`
- On first access, open `/login` and create the initial admin account.

### Run everything with Docker

```bash
cp .env.docker.example .env
# Edit .env and set SESSION_SECRET (e.g.: openssl rand -base64 24)
docker compose up -d
```

- Hub MCP endpoint: `http://localhost:3000/mcp`  
- Admin Panel: `http://localhost:3001`
- When you add, remove, or disable a plugin in the Admin Panel, it calls the Hub’s `POST /reload` endpoint so plugin tools appear or disappear **without restarting** the Hub (`HUB_BASE_URL` controls the Hub URL in Docker).

For more deployment details (reverse proxy, HTTPS, etc.), see `docs/deployment.md`.

---

## Using the Admin Panel

The Admin Panel is the single place where you manage everything the Hub exposes to AI clients.

From the Admin Panel you can:

- **Tools**
  - Create dynamic tools wrapping the core handlers:
    - `create_file`
    - `read_file`
    - `run_command`
  - Define for each tool:
    - Name (what Cursor and other MCP clients see in `tools/list`).
    - Description (how the AI understands when and why to call it).
    - Input schema (JSON shape of parameters).
    - Handler reference (`create_file`, `read_file`, or `run_command`).
    - Allowed roles.

- **Skills**
  - Create workflows that run multiple steps (tools or plugin tools).
  - Define:
    - Name (`skill:<name>` in MCP).
    - Description.
    - Ordered steps.
    - Shared input schema for all steps.
    - Allowed roles.

- **Plugins**
  - Register and configure external MCP servers (e.g. `npx my-mcp-plugin`).
  - Manage for each plugin:
    - Command / args / env.
    - Role visibility.
  - Plugin tools, prompts, and resources are all surfaced through the Hub.

- **Prompts**
  - Manage prompts exposed to MCP clients (including core prompts like `hub_help`).
  - Define:
    - Name and description.
    - Underlying text/content.
    - Allowed roles.
  - Prompts can come from code or from `dynamic-registry.json`, and are listed in Cursor’s **Prompts** UI.

- **Resources**
  - Manage read‑only resources exposed by the Hub.
  - Example: `rs4it://registry` returns a JSON summary of tools, skills, plugins, and optionally roles/prompts metadata.
  - Resources are implemented in the Hub and optionally registered in `dynamic-registry.json` so they appear in the Admin Panel and in Cursor’s **Resources** panel.

- **Roles & Permissions**
  - Create and manage roles.
  - Define inheritance and per‑entity permissions (Tool / Skill / Plugin / Prompt / Resource).
  - Visualize role graphs and inheritance using React Flow.

- **Usage & MCP Users**
  - Inspect which tools/skills/plugins are being called and by whom.
  - See per‑user statistics:
    - Last time a user connected to the Hub.
    - Last time they invoked a tool or skill.
    - Which role(s) they used.
  - View aggregated usage analytics (which entities are used most, by which roles/users) as described in phases 11–12 in `docs/phases/`.

The Admin Panel implementation and flows are described in:

- `docs/phases/08-phase-admin-panel.md`
- `docs/phases/09-phase-roles-and-visibility.md`
- `docs/phases/11-phase-mcp-users-tracking.md`
- `docs/phases/12-phase-usage-tracking.md`
- `docs/phases/13-phase-prompts-and-resources.md`

---

## Project Structure

```text
rs4it mcp/
├── README.md                   # Main project overview (this file)
├── PROJECT-STRUCTURE.md        # More detailed tree & explanations
├── package.json                # Hub package and scripts
├── package-lock.json
├── docker-compose.yml
├── Dockerfile                  # Hub container image
├── .env.docker.example         # Example env for Docker deployments
├── .dockerignore
├── .gitignore
├── .gitattributes
│
├── src/                        # Hub core (Node.js + MCP)
│   ├── server/                 # Entry points (stdio + HTTP), tool aggregation and routing
│   │   ├── index.ts
│   │   ├── server.ts
│   │   └── http-entry.ts
│   ├── tools/                  # Atomic tools (create_file, read_file, run_command, registry)
│   │   ├── create-file.ts
│   │   ├── read-file.ts
│   │   ├── run-command.ts
│   │   ├── registry.ts
│   │   └── index.ts
│   ├── skills/                 # Skills registry and skill implementations
│   │   ├── create-api-endpoint.ts
│   │   ├── index.ts
│   │   └── registry.ts
│   ├── plugins/                # Loading and managing external MCP plugins
│   │   ├── client.ts
│   │   ├── constants.ts
│   │   ├── loader.ts
│   │   ├── index.ts
│   │   └── types.ts
│   ├── resources/              # MCP resources (e.g. rs4it://registry)
│   │   ├── index.ts
│   │   └── registry-resource.ts
│   ├── prompts/                # MCP prompts (e.g. hub_help)
│   │   ├── hub-help.ts
│   │   └── index.ts
│   ├── config/                 # Internal config loading and in‑memory stores
│   │   ├── constants.ts
│   │   ├── dynamic-config.ts
│   │   ├── load-plugins-config.ts
│   │   ├── mcp-users-store.ts
│   │   ├── plugin-status-store.ts
│   │   ├── roles.ts
│   │   ├── transport.ts
│   │   ├── usage-store.ts
│   │   └── workspace.ts
│   ├── types/                  # Shared TypeScript types
│   │   ├── dynamic-registry.ts
│   │   ├── roles.ts
│   │   ├── routing.ts
│   │   ├── skills.ts
│   │   └── tools.ts
│   └── router.ts               # tools/call routing by name
│
├── admin/                      # Admin Panel (Next.js)
│   ├── app/                    # App router: pages + API routes
│   │   ├── api/                # REST API used by the panel
│   │   │   ├── registry/route.ts
│   │   │   ├── tools/[id]/route.ts
│   │   │   ├── tools/route.ts
│   │   │   ├── skills/[id]/route.ts
│   │   │   ├── skills/route.ts
│   │   │   ├── plugins/[id]/route.ts
│   │   │   ├── plugins/route.ts
│   │   │   ├── prompts/[id]/route.ts
│   │   │   ├── prompts/route.ts
│   │   │   ├── resources/[id]/route.ts
│   │   │   ├── resources/route.ts
│   │   │   ├── roles/[id]/route.ts
│   │   │   ├── roles/route.ts
│   │   │   ├── usage/route.ts
│   │   │   ├── mcp-users/route.ts
│   │   │   ├── plugin-status/route.ts
│   │   │   ├── reload/route.ts
│   │   │   └── auth/...        # login, setup, status, credentials, logout
│   │   ├── (pages)             # UI pages: tools, skills, plugins, roles, usage, mcp-users, resources, prompts, analytics, settings, status, permissions
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/             # Reusable UI components
│   │   ├── layout/             # Layout shell, sidebar, topbar, layout switcher
│   │   ├── roles/              # Role graphs, allowed role pickers
│   │   ├── ui/                 # Buttons, inputs, dialogs, cards, badges, etc.
│   │   └── table-cell-text.tsx
│   ├── lib/                    # Client helpers to talk to the Hub
│   │   ├── registry.ts
│   │   ├── roles.ts
│   │   ├── usage.ts
│   │   ├── usage-types.ts
│   │   ├── mcp-users.ts
│   │   ├── plugin-status.ts
│   │   ├── credentials.ts
│   │   ├── auth.ts
│   │   ├── auth-edge.ts
│   │   ├── toast.ts
│   │   └── utils.ts
│   ├── public/                 # Static assets for the panel
│   │   └── icon.svg
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── next-env.d.ts
│   ├── package.json
│   ├── package-lock.json
│   ├── Dockerfile              # Admin Panel container image
│   └── .env.example            # Example env for the panel
│
├── config/                     # Runtime config files
│   ├── roles.json              # Role definitions and inheritance
│   ├── dynamic-registry.json   # Dynamic tools/skills/plugins/prompts/resources
│   └── mcp_plugins.json        # External MCP plugins registry
│
├── docs/                       # Documentation and design
│   ├── README.md               # Docs index and phase order
│   ├── architecture.md         # Architecture and design decisions
│   ├── deployment.md           # Hosting, Docker, reverse proxy, MCP clients
│   ├── admin-auth.md           # Panel authentication and setup
│   ├── security.md             # Security considerations
│   ├── requirements.md         # Requirements and environment variables
│   ├── evolution-roadmap.md
│   ├── future/                 # Future work notes
│   ├── phases/                 # Implementation phases 00–14
│   └── screen/                 # Screenshots for docs and README
│
├── assets/                     # Brand assets and shared images
│   ├── README.md
│   └── rs4it-logo.webp
│
└── scripts/                    # Helper scripts
    └── docker-entrypoint.sh    # Entrypoint script for Docker images
```

---

## Documentation & Implementation Phases

### Documentation

| Document | Content |
|----------|---------|
| `docs/README.md` | Docs index and phase order |
| `docs/requirements.md` | Requirements and environment variables |
| `docs/architecture.md` | Architecture, naming, roles |
| `docs/deployment.md` | Hosting, Docker, reverse proxy, connecting clients |
| `docs/admin-auth.md` | Panel authentication and initial setup |
| `docs/phases/` | Phases 00–11 (overview, MCP, tools, skills, plugins, routing, hosting, panel, roles, auth, MCP users, usage, prompts/resources) |

Phases are meant to be followed in order; each builds on the previous.

### Implementation Status

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

Screens from the latest Admin Panel UI (from `docs/screen`):

![Dashboard and status](docs/screen/Screenshot%202026-03-16%20122532.png)

![Tools, skills, plugins management](docs/screen/Screenshot%202026-03-16%20122550.png)

![Roles graph and permissions](docs/screen/Screenshot%202026-03-16%20122610.png)

![Usage analytics](docs/screen/Screenshot%202026-03-16%20122626.png)

![MCP users](docs/screen/Screenshot%202026-03-16%20122701.png)

![Resources view](docs/screen/Screenshot%202026-03-16%20122751.png)

![Prompts view](docs/screen/Screenshot%202026-03-16%20122805.png)

---

## Connecting Cursor

After hosting the Hub (locally or remotely), you can add it in **Cursor** as a custom MCP server:

1. Open **Cursor** → Settings (`Ctrl + ,`) → **Tools & MCP** → **Add new MCP server**
2. **Type**: `streamableHttp`
3. **URL**: your MCP endpoint, e.g.:
   - `http://localhost:3000/mcp` (local)
   - `https://your-domain.com/mcp` (remote)
4. **Headers** (optional): set `X-MCP-Role` to the role you want to expose (e.g. `full_stack`).
5. Save and **restart Cursor**.

For more details (including `.cursor/mcp.json` configuration and other MCP clients), see  
`docs/deployment.md` → “Connecting Cursor or another MCP client”.

### Troubleshooting (Cursor / `-32603` / SSE)

- **`Streamable HTTP` error with `-32603` on first connect**  
  The Hub failed while creating the MCP session (building the server or handling `initialize`). Check **Hub process logs** for lines like `[rs4it-mcp] Session creation failed` or `Connect/handleRequest failed`.  
  To return a short error message in the JSON-RPC response (for debugging only), set **`MCP_DEBUG=true`** or **`MCP_EXPOSE_CLIENT_ERRORS=true`** on the Hub process, then retry.

- **SSE fallback shows `400`**  
  This Hub expects **Streamable HTTP** for the initial handshake. `GET /mcp` without a valid `mcp-session-id` returns **400** by design. Fix the **POST `/mcp` (initialize)** failure first; do not rely on SSE alone.

- **`SSE stream disconnected: TypeError: terminated`**  
  Often a **timeout**, **proxy**, or **client reconnect**; the Cursor MCP client usually reconnects. If it loops forever, verify the Hub URL/port, firewall, and that the Hub stayed running.

- **After editing MCP config in Cursor (`config_server_modified`)**  
  Confirm the **URL** still matches the Hub (same host, port, path `/mcp`, `http` vs `https`). Restart the Hub if needed.

---

## License & Project Status

- **License**: UNLICENSED (internal use according to company policy).
- The project is based on the **Company MCP Platform — System Architecture** report and is updated continuously as new phases are implemented and refined in `docs/phases/`.
