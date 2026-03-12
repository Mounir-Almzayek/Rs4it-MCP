# Phase 09 — Roles & Visibility

## Goal

Introduce **roles** and bind tools, skills, and plugins to roles so the Hub can return a filtered tool list by the connecting client’s role (e.g. Cursor passes the user’s role), enabling better control, a clearer interface for the AI, and reduced exposure of sensitive tools.

---

## Expected Outputs

- **Roles** model (e.g. `developer`, `admin`, `viewer`) defined in config or in the panel.
- For each tool/skill/plugin, the ability to bind **allowed roles** (or “all” if not set).
- On `tools/list` (or on initialize): the client passes a **role id** (header, field in params, or derived from auth).
- The Hub filters the list and returns only tools allowed for that role.
- Documentation on how the user/team sets the connection role in Cursor (if possible) or in another client.

---

## Sub-tasks

### 9.1 Roles model and storage

- Define default roles (e.g. `default`, `developer`, `admin`) and ability to add roles from the panel later.
- Store “who can see/call what”: either in config (file, DB) or attached to each tool/skill/plugin as a role list.
- Decision: are roles tied to a “user” (auth) or passed explicitly by the client (e.g. header `X-MCP-Role: developer`). Documentation should clarify the difference and security implications.

### 9.2 Receiving role id from the client

- Agreement between Hub and client: how the role is passed (e.g. HTTP header, field in initialize request, or from auth token).
- In the Hub: extract role from request/session and use it when filtering `tools/list` and (optionally) when validating `tools/call`.

### 9.3 Filtering tools/list by role

- When building the tool list (local + skills + plugins): exclude any tool not allowed for the current role.
- Return the same response format; the client (Cursor) sees only allowed tools.

### 9.4 Validation on tools/call (optional)

- On tool call: verify that the session’s role is allowed for that tool; if not, return a clear error without executing.

### 9.5 Cursor and the client

- Document: if Cursor (or the client in use) supports custom headers or params, how the user sets the connection role (e.g. Cursor config for a given Hub).
- If the client does not support passing the role: document that the Hub can run without roles (return all tools) or use a default role.

---

## Completion Criteria

- Roles are configured and tools/skills/plugins are bound to roles.
- When a role is passed, `tools/list` returns only tools allowed for that role.
- Calling a tool not allowed (if validation is enabled) returns a clear error.

---

## Dependencies

- **Phase 07** (server hosting) is practically required to use roles with multiple clients; stdio transport usually does not carry “user” or “role” context unless passed via environment.
- **Phase 08** (panel) is useful to manage role–tool binding from the UI instead of editing config by hand.

---

## Suggested Files

| File | Purpose |
|------|---------|
| `src/types/roles.ts` | Role types and tool permissions |
| `src/config/roles.ts` or from panel | Load/edit role ↔ tool/skill/plugin bindings |
| Update `tools/list` aggregation (in server or router) | Apply filtering by role |
| `docs/architecture.md` | Short update describing roles and role-passing convention |

---

## Notes

- Roles improve the Cursor experience: a shorter, more relevant tool list for the developer’s role, with administrative or dangerous tools limited to higher permissions.
- You can start with a single default role (e.g. `default`) meaning “all tools” and add filtering later when multiple roles exist.
