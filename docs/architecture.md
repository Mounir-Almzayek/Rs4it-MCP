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
