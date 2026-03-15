# Platform Architecture — RS4IT MCP Hub

## Overview

The platform combines **tools** (atomic operations) and **skills** (composite workflows) under a single MCP interface.

## Exposing Skills to the Client (Phase 03)

**Decision**: Skills are exposed as tools in `tools/list` with a distinct prefix.

- **Name format**: `skill:<skill_name>` (e.g. `skill:create_api_endpoint`).
- **Benefit**: A single client (e.g. Cursor) calls `tools/list` and gets regular tools plus skills without a separate `skills/list` or `skills/call`.
- **Implementation**: When a tool name starts with `skill:`, the server extracts the skill name, calls `executeSkill(name, args)`, and returns the result in the same MCP tool format.

There is no separate capability (e.g. `skills/list`); everything goes through `tools/list` and `tools/call`.

## Layers

| Layer | Content |
|-------|---------|
| **Tools** | Atomic tools (create_file, read_file, run_command) registered in the registry; called from skills or from the client. |
| **Skills** | Composite workflows that call tools (local or plugins via `routeToolCall`); exposed as tools with names `skill:*`. |
| **Plugins** | External MCP plugins; their tools are exposed with names `plugin:<id>:<name>`. |
| **Server** | Registers all sources (tools + skills + plugin tools) on McpServer; unified response for `tools/list` and routing of `tools/call` by name (see `src/types/routing.ts` and `src/router.ts`). |

## External Plugins (Phase 04)

- Plugins are loaded at Hub startup from `config/mcp_plugins.json` (or from `MCP_PLUGINS_CONFIG` path).
- Each plugin runs as a subprocess (e.g. `npx -y package@latest`) and the Hub communicates with it via **stdio** as an MCP client.
- Plugin tool lists are stored with names prefixed `plugin:<id>:<tool_name>` for integration in Phase 05.
- Closing the Hub stops all plugin processes.

## Naming Convention and Unified Routing (Phase 05)

### Tool name → Source

| Source | Name format | Examples |
|--------|-------------|----------|
| **Local** | Direct name | `create_file`, `run_command`, `read_file` |
| **Skill** | `skill:<skill_name>` | `skill:create_api_endpoint` |
| **Plugin** | `plugin:<plugin_id>:<original_tool_name>` | `plugin:hello:echo` |

- **tools/list**: Single unified response aggregating local tools + skills (as tools) + each loaded plugin’s tools, with no duplicate names. Description and input schema are preserved per tool.
- **tools/call**: Source is determined from the tool name (local / skill / plugin), then the appropriate registry or plugin client is invoked and the result returned. Unknown tool or unavailable plugin → clear error message without crashing the server.

### Skills calling tools from multiple sources (optional)

- A skill handler can call any registered tool (local or plugin) via the unified **`routeToolCall(name, args)`** interface in `src/router.ts`, so the Hub routes to the correct source.

## Roles and Visibility (Phase 09)

- **Roles**: Defined in `config/roles.json` (or `MCP_ROLES_CONFIG`). Each role has `id` and optionally `inherits` (list of roles to inherit from). Examples: `developer`, `web_engineer`, `backend_engineer`, `full_stack` (inherits web + backend), `admin`, `viewer`.
- **Inheritance**: A user connecting with a given role sees everything allowed for that role **and all inherited roles**. The function `getEffectiveRoles(roleId)` returns the role and all inherited roles (transitively).
- **Permission binding**: Each tool/skill/plugin in the dynamic registry can have `allowedRoles` (list of allowed roles). If empty or undefined → visible to all roles. Built-in tools and skills are visible to everyone.
- **Passing role from client**:
  - **HTTP**: Header `X-MCP-Role` or `params.role` in the `initialize` request.
  - **stdio**: Environment variable `MCP_ROLE`.
- When the session is created (or stdio starts), the Hub filters what is registered: only tools/skills/plugins allowed for the effective role are registered. If no role is passed, all tools are exposed (legacy behaviour).
- **Security**: Passing the role from the client (header/env) does not replace authentication; roles can later be tied to authentication (e.g. from a token) if available.

## MCP user tracking (Phase 11)

- **Purpose**: Register which clients connect to the Hub (by a user name they send) and track the last time they used the connection, for visibility in the admin panel.
- **Passing the user name**: Same style as role. **HTTP**: Header **`X-MCP-User-Name`** or **`params.userName`** in the `initialize` request. The value is stored in the session; if the client does not send a name, no user record is created or updated.
- **Storage**: A JSON file (e.g. `config/mcp_users.json`, or path from **`MCP_USERS_FILE`**) shared between the Hub and the admin panel. Each record has at least `name` and `last_used_at` (ISO); optional `first_seen_at` and `request_count`.
- **When it is updated**: On every meaningful MCP request (e.g. `initialize`, POST with session, GET for SSE), if the session has a user name, the Hub updates that user’s `last_used_at` (and increments `request_count`) in a non-blocking way so that latency is not affected.
- **Admin panel**: A dedicated “MCP Users” tab lists all recorded users with name and last used time (and optionally first seen and request count). Data is read from the same file via `GET /api/mcp-users` (authenticated).
- **Security**: The user name is not authenticated; it is whatever the client sends. Use for visibility and usage tracking only.

## Usage tracking (Phase 12)

- **Purpose**: Record every tool/skill/plugin invocation: **how many times** each was called and **by whom** (same user name from `X-MCP-User-Name` or anonymous), for visibility in the admin panel.
- **When it is recorded**: On each `tools/call`, the Hub calls an optional **onToolInvoked(toolName)** callback. The HTTP entry passes a callback that appends one event (tool name + session user name) to the usage store in a **fire-and-forget** way so request latency is not affected.
- **Storage**: A JSON file (e.g. `config/mcp_usage.json`, or path from **`MCP_USAGE_FILE`**) with a list of events: `toolName`, `userName` (optional), `timestamp`. The Hub writes; the admin panel reads and aggregates (by entity, by user). A cap on the number of stored events (e.g. 50,000) avoids unbounded growth.
- **stdio**: When the Hub runs over stdio, no user context is available; the callback is not passed, so usage is not recorded. Tracking is only active for HTTP transport.
- **Admin panel**: A "Usage" tab shows per-entity stats (name, type tool/skill/plugin, total invocations, breakdown by user) and optionally the last N recent invocations. Data is read via `GET /api/usage` (authenticated).

## Prompts and Resources (Phase 13)

- **Purpose**: Expose **prompts** and **resources** so Cursor (and other MCP clients) show “X tools, Y prompts, Z resources” for the Hub, similar to plugin servers like Figma.
- **Capabilities**: The Hub advertises `prompts: { listChanged: true }` and `resources: { listChanged: true }` in `initialize`. Clients can call `prompts/list`, `prompts/get`, `resources/list`, and `resources/read`.
- **Built-in prompts**: Registered in `src/prompts/`. Example: **hub_help** — instructions for using the Hub (tools, skills, plugins, roles), with optional argument `topic` (`'tools'` | `'skills'` | `'plugins'`) for a shorter section.
- **Built-in resources**: Registered in `src/resources/`. Example: **hub_registry** at URI **`rs4it://registry`** — JSON summary of available tools (built-in + dynamic), skills, and loaded plugins, built at read time.
- **URI scheme**: Hub resources use the **`rs4it://`** scheme (e.g. `rs4it://registry`) to avoid collisions with file or other URIs. Future resources can follow the same scheme (e.g. `rs4it://tool/{name}`).
