# Phase 12 — Usage Tracking (تتبع استدعاءات الأدوات والسكيلز والبلجنات)

## Goal

Track **every invocation** of tools, skills, and plugins: **how many times** each was called and **by whom** (MCP user name from header). Expose aggregated stats in the admin panel so admins can see usage per entity and per user.

---

## Expected Outputs

- **Per-invocation record**: On each `tools/call`, record at least: **tool/skill/plugin name**, **caller** (user name from `X-MCP-User-Name` or anonymous), **timestamp**.
- **Storage**: A dedicated store (e.g. JSON file `config/usage_log.json` or `mcp_usage.json`) that the Hub writes to and the admin panel reads. Option: append-only log for events, or aggregated counters; aggregation on read is flexible for future filters (e.g. last 7 days).
- **Hub integration**: When a tool (built-in, dynamic), skill (built-in, dynamic), or plugin tool is invoked, call a small **usage recorder** (fire-and-forget) so request latency is not affected.
- **Panel API**: Authenticated endpoint (e.g. `GET /api/usage`) returning:
  - **By entity**: for each tool/skill/plugin name: total count, and per-user breakdown (user name → count).
  - Optionally: last N invocations with timestamp and user.
- **Admin panel UI**: A new tab (e.g. **Usage** / **تتبع الاستخدام**) with:
  - Table or cards: entity name, type (tool / skill / plugin), total invocations, and breakdown by user (who called it how many times).
  - Optional: time range filter, sort by usage, export.

---

## Sub-tasks

### 12.1 Backend — Usage store

- [ ] Define data model for one **invocation event**: `toolName` (string), `userName` (string | undefined for anonymous), `timestamp` (ISO string).
- [ ] Choose storage: same pattern as Phase 11 (JSON file under `config/`, path from env `MCP_USAGE_FILE`). Structure: either list of events (append-only) or pre-aggregated counters; recommendation: **list of events** for flexibility, aggregate on read.
- [ ] Create module (e.g. `src/config/usage-store.ts`):
  - **recordInvocation(toolName, userName?)** — append one event (fire-and-forget, non-blocking).
  - **getUsageStats(options?)** — read events, aggregate by entity and by user; return e.g. `{ byEntity: Record<toolName, { total, byUser: Record<userName, count> }>, recent?: Event[] }`.
- [ ] Optional: retention (e.g. keep last 90 days) or max events to avoid unbounded growth; document in architecture.

### 12.2 Backend — Hook into tool execution

- [ ] Extend **CreateServerOptions** with optional **onToolInvoked?(toolName: string)**. The Hub does not know the “current user”; the **HTTP entry** (or stdio entry) passes a callback that closes over the session’s `userName`.
- [ ] In **server.ts**: for every registered tool (built-in tools, built-in skills, dynamic tools, dynamic skills, plugin tools), after calling the actual handler (or in a wrapper), call **onToolInvoked(toolName)** when provided. Tool name is the same as in `tools/list` (e.g. `create_file`, `skill:welcome_file`, `plugin:figma:get_design_context`).
- [ ] In **http-entry.ts**: when creating a session and calling `createServer`, pass **onToolInvoked: (name) => recordInvocation(name, state.userName)** so each invocation is recorded with the session’s user (or undefined for anonymous).
- [ ] For **stdio** entry: either do not pass `onToolInvoked` (no tracking) or pass a callback that records with `userName: undefined`; document behaviour.

### 12.3 Backend — Panel API for usage

- [ ] Add authenticated endpoint **GET /api/usage** (or **GET /api/usage/stats**):
  - Requires same auth as other panel APIs.
  - Reads from usage store and returns aggregated stats: by entity (tool/skill/plugin name), total count, and per-user counts; optionally last N events with timestamp and user.
  - Query params (optional): `limit` for recent events, `since` (ISO date) to filter by time.
- [ ] Document response shape in API or docs.

### 12.4 Frontend — Usage tab in admin panel

- [ ] Add a **Usage** (or **تتبع الاستخدام**) item in the sidebar.
- [ ] Create page/route (e.g. `/usage`) that fetches `GET /api/usage` and displays:
  - **By entity**: table or list — columns: Name, Type (tool / skill / plugin), Total invocations, and “By user” (e.g. expandable or sub-table: user name → count).
  - Optional: “Recent invocations” list (tool name, user, time).
- [ ] Handle empty state (no usage yet). Optional: refresh button or auto-refresh.

### 12.5 Documentation

- [ ] Update **docs/architecture.md**: short section on “Usage tracking” — what is recorded, where it is stored, how it is exposed in the panel.
- [ ] Update **docs/requirements.md** and **docs/deployment.md**: env var **MCP_USAGE_FILE** (path to usage log), and note that tracking runs only when Hub is used over HTTP with the callback (stdio may skip or use anonymous).
- [ ] In Phase 12 doc (this file): mark sub-tasks done when implemented.

---

## Completion Criteria

- Every `tools/call` (for any tool, skill, or plugin) is recorded with tool name and caller (user name or anonymous).
- Panel API **GET /api/usage** returns aggregated usage (by entity, by user) for authenticated admins.
- Admin panel has a **Usage** tab showing per-entity and per-user invocation counts.

---

## Dependencies

- **Phase 07** (Server Hosting): HTTP transport so session and user name are available.
- **Phase 11** (MCP Users Tracking): Same header `X-MCP-User-Name` (or param) for “who” called; usage store can live alongside `mcp_users.json`.

---

## Suggested Files

| File / Layer | Purpose |
|--------------|--------|
| `src/config/usage-store.ts` | recordInvocation, getUsageStats; read/write usage log file |
| `src/server/server.ts` | CreateServerOptions.onToolInvoked; call it from every tool handler |
| `src/server/http-entry.ts` | Pass onToolInvoked that calls recordInvocation(name, state.userName) |
| Panel: `app/usage/page.tsx` | Usage tab UI — by entity, by user |
| Panel: `app/api/usage/route.ts` | GET /api/usage → read usage store, return aggregated stats |
| `docs/architecture.md` | Usage tracking section |
| `docs/requirements.md`, `docs/deployment.md` | MCP_USAGE_FILE, behaviour (HTTP vs stdio) |

---

## Notes

- **Entity type**: Derive from name: `name.startsWith("skill:")` → skill, `name.startsWith("plugin:")` → plugin, else → tool.
- **Anonymous**: If no `X-MCP-User-Name` is sent, store `userName` as `undefined` or `"anonymous"` so “by user” still makes sense.
- **Performance**: recordInvocation must be non-blocking (e.g. void promise or fire-and-forget) so MCP response time is not impacted.
