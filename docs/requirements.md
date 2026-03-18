# Project Requirements — RS4IT MCP Hub

## Node.js Version

- **Required**: Node.js **20.x** LTS or newer (e.g. 20.x, 22.x).
- Prefer [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage versions.

Check version:

```bash
node -v
```

## Language and Build

- **TypeScript** for the entire project.
- Build: `tsc` (from `tsconfig.json`).
- Development: `tsx` to run `.ts` files directly without a prior build.

## Planned Dependencies

| Package | Usage |
|---------|--------|
| `@modelcontextprotocol/sdk` | Official MCP library for building the server (Phase 01+) |
| `typescript` | Compilation and types |
| `tsx` | Running TypeScript during development (`npm run dev`) |

## Environment Variables

- **`MCP_WORKSPACE_ROOT`** (optional): Workspace root path for file operations (create_file, read_file). See [docs/security.md](security.md).
- **`MCP_PLUGINS_CONFIG`** (optional): Path to external plugins config file (JSON). If not set, `config/mcp_plugins.json` is used relative to the working directory.
- **Skill Compiler (Hybrid skill authoring)**:
  - **`OPENROUTER_API_KEY`** or **`MCP_OPENROUTER_API_KEY`** (required to enable compiler): API key used by the Hub to compile skill text into a draft skill.
  - **`OPENROUTER_MODEL`** or **`MCP_SKILL_COMPILER_MODEL`** (optional): OpenRouter model id. Default: `openai/gpt-4o-mini`.
  - **`MCP_ADMIN_API_SECRET`** (optional, recommended): If set, Hub requires header `X-Admin-Secret` for `/api/skill-compiler/*` endpoints. Admin panel can pass it via `ADMIN_HUB_SECRET` or `MCP_ADMIN_API_SECRET`.
  - **`MCP_SKILL_EXECUTIONS_FILE`** (optional): Path to store execution traces for `/api/skill-compiler/execute`. Default: `config/skill_executions.json`.
- **Roles (Phase 09)**:
  - **`MCP_ROLE`** (optional, stdio): Connection role (e.g. `web_engineer`, `full_stack`). When set, the Hub exposes only tools/skills/plugins allowed for that role (with inheritance). If not set, all tools are exposed.
  - **`MCP_ROLES_CONFIG`** (optional): Path to roles definition file (JSON). If not set, `config/roles.json` is used.
  - **HTTP**: Client passes the role via header **`X-MCP-Role`** or via **`params.role`** in the `initialize` request; the same session uses this role for the whole connection.
- **MCP user tracking (Phase 11)**:
  - **`MCP_USERS_FILE`** (optional): Path to the JSON file where MCP user names and last-used timestamps are stored. If not set, the Hub uses `config/mcp_users.json`; the admin panel uses the same path (or `../config/mcp_users.json` when run from the admin folder).
  - **HTTP**: Client can pass the user name via header **`X-MCP-User-Name`** or via **`params.userName`** in the `initialize` request. If present, the Hub records/updates that user and refreshes “last used” on each request.
- **Usage tracking (Phase 12)**:
  - **`MCP_USAGE_FILE`** (optional): Path to the JSON file where tool/skill/plugin invocations are logged (tool name, user name, timestamp). If not set, the Hub uses `config/mcp_usage.json`; the admin panel uses the same path when serving `GET /api/usage`. Tracking runs only when the Hub is used over HTTP (not stdio).
- **Host validation (behind reverse proxy)**:
  - **`MCP_ALLOWED_HOSTS`** (optional): Comma-separated list of hostnames allowed in the `Host` header (e.g. `rs4it-mcp.ai.system2030.com`). Required when the Hub is behind HTTPS/proxy; otherwise the SDK rejects requests with “Invalid Host”. Localhost is always allowed in addition.
- **Admin panel (Phase 10)**:
  - **`SESSION_SECRET`** or **`ADMIN_SESSION_SECRET`** (required to enable auth): Secret key for the session, at least 16 characters. See [docs/admin-auth.md](admin-auth.md).
  - **`ADMIN_CREDENTIALS_PATH`** (optional): Path to admin credentials file (username + password hash). Default: `../config/admin-credentials.json`.
- **For HTTP hosting (Phase 07)**:
  - **`PORT`** or **`MCP_PORT`** (optional): Server port. Default: `3000`.
  - **`MCP_TRANSPORT`** (optional): `stdio` (default) or `http`. Used when running the appropriate entry point only.
  - **`BASE_URL`** (optional): Base URL for the Hub (e.g. `https://mcp.example.com`) for documentation or client setup.

## Running the Server (after Phase 01 and 07)

- **stdio transport (local, suitable for Cursor)**:
  - `npm run start` — run from `dist/`
  - `npm run dev` — run with fast development (tsx)
- **HTTP transport (server hosting, Phase 07)**:
  - `npm run start:server` — run the network server from `dist/`
  - `npm run dev:server` — run with fast development
  - See [docs/deployment.md](deployment.md) for production hosting.

Build and run commands:

```bash
npm run build        # Build the project
npm run start        # Run stdio (local)
npm run start:server # Run HTTP on port (e.g. 3000)
npm run dev          # Development stdio
npm run dev:server   # Development HTTP
```

## Documentation and Phases

- Implementation phases are defined in **`docs/phases/`** and should be followed in order (00 → … → 09).
- Index: [docs/README.md](README.md).
- HTTP hosting in production: [docs/deployment.md](deployment.md).
