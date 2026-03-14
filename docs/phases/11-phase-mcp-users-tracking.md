# Phase 11 — MCP Users Tracking (تتبع مستخدمي MCP)

## Goal

When a client connects to the MCP Hub, **register the user’s name** (passed in a header, similar to the role) and **track the last time the connection was used**. Expose this data in the admin panel in a dedicated tab with a table of users and their last usage time.

---

## Expected Outputs

- **Name in header**: The client passes the user name via an HTTP header (e.g. `X-MCP-User-Name`) or via params in the `initialize` request, analogous to `X-MCP-Role`.
- **Registration on connect**: On each `initialize` (or first request per session), the Hub reads the name, creates or updates a “MCP user” record, and updates the “last used” timestamp.
- **Last usage tracking**: On every meaningful request (e.g. `initialize`, `tools/list`, `tools/call`), update the “last used at” timestamp for that user so the panel shows real usage.
- **Backend storage**: A dedicated store (table or JSON/file) for MCP users: at least **user name** (or id) and **last_used_at**.
- **Panel API**: An authenticated endpoint (e.g. `GET /api/mcp-users`) that returns the list of MCP users with name and last_used_at for the admin panel.
- **Admin panel UI**: A **new tab** (e.g. “MCP Users” / “مستخدمو MCP”) containing a **table** with columns: user name (or identifier) and last usage time; optionally sortable or filterable.

---

## Sub-tasks

### 11.1 Backend — Passing and reading the user name

- [ ] Define the convention for passing the user name (same style as Phase 09 for role):
  - **HTTP/SSE**: Header `X-MCP-User-Name` (or `X-MCP-User-Id`) with the `initialize` request; if the client sends it on every request, the Hub can use it to update last usage on each call.
  - **Optional**: Support `params.userName` or `params.userId` in the `initialize` request body as fallback.
- [ ] Document the header/param name in `docs/architecture.md` and `docs/requirements.md` (and deployment if relevant).
- [ ] In the Hub (HTTP/SSE path): extract the user name from the request (header or session) in the same layer where the role is read (e.g. session or request context).
- [ ] If no name is sent: either treat as “anonymous” (single anonymous user) or do not create/update a user record; document the chosen behaviour.

### 11.2 Backend — Storage model for MCP users

- [ ] Define the data model for “MCP user”:
  - **Identifier**: `name` (string) or `userId` (string), or both; must be unique per user for updates.
  - **last_used_at**: ISO timestamp or Unix ms; updated whenever the user makes a request (initialize, tools/list, tools/call).
  - Optional: `first_seen_at`, `request_count` if useful for the panel.
- [ ] Choose storage: same as dynamic config (e.g. SQLite, PostgreSQL, or a JSON file like `mcp_users.json`) so the Hub and the panel can share it.
- [ ] Create an interface or module (e.g. `src/admin/mcp-users-store.ts` or under existing admin store) to:
  - **Upsert** user by name/id and set/update `last_used_at`.
  - **List** all users with name and last_used_at (for the panel API).

### 11.3 Backend — Updating last usage on each request

- [ ] After resolving the session (and reading role and user name):
  - If a user name/id is present: call the store to upsert the user and set `last_used_at` to the current time.
- [ ] Decide which requests update “last used” (recommended: at least `initialize`, `tools/list`, and `tools/call` so that any real usage is reflected).
- [ ] Ensure this update is non-blocking (e.g. fire-and-forget or quick write) so it does not add noticeable latency to MCP requests.

### 11.4 Backend — Panel API for MCP users

- [ ] Add an authenticated endpoint, e.g. `GET /api/mcp-users`, that:
  - Requires the same auth as other panel APIs (Phase 10).
  - Returns a list of MCP users with at least: `name` (or `userId`) and `last_used_at`; optional: `first_seen_at`, `request_count`.
  - Sort by `last_used_at` descending by default so “last used” is visible at a glance.
- [ ] Document the endpoint (path, response shape) in the panel or API docs.

### 11.5 Frontend — New tab and table in the admin panel

- [ ] Add a **new tab** in the admin panel navigation (e.g. “MCP Users” / “مستخدمو MCP” / “اتصالات MCP”) so it appears alongside Tools, Skills, Plugins, Roles, etc.
- [ ] Create a **page/route** for this tab (e.g. `/mcp-users` or `/users`).
- [ ] On that page, render a **table** with at least:
  - **User name** (or identifier): the value passed in the header/param.
  - **Last used at**: formatted date/time (e.g. locale string or relative “X minutes ago”); handle timezone if needed.
- [ ] Optional: columns for “First seen” and “Request count” if the backend provides them.
- [ ] Optional: sort by last used, search/filter by name; refresh button or auto-refresh interval.
- [ ] Handle empty state (no MCP users yet) with a clear message.
- [ ] Ensure the table is read-only in this phase (no delete/edit required unless specified later).

### 11.6 Documentation and consistency

- [ ] Update `docs/architecture.md`: short section on “MCP user tracking” and how the name is passed (header/param) and how last usage is updated.
- [ ] Update `docs/requirements.md` or `docs/deployment.md`: document the header (e.g. `X-MCP-User-Name`) and optional env or config if any.
- [ ] In Cursor (or client) docs: how to set the user name in the connection (e.g. in `headers` like `X-MCP-Role`) so that usage is attributed correctly.

---

## Completion Criteria

- When a client connects with a user name in the header (or param), the Hub records/updates that user and sets last_used_at.
- Each subsequent request from that user updates last_used_at.
- The panel API `GET /api/mcp-users` returns the list of users with name and last_used_at (when called by an authenticated admin).
- The admin panel has a dedicated tab with a table showing MCP users and their last usage time.

---

## Dependencies

- **Phase 07** (Server Hosting): HTTP/SSE transport so that headers (and thus user name) can be sent.
- **Phase 08** (Admin Panel): Panel exists so the new tab and table can be added.
- **Phase 10** (Admin Authentication): Panel API is protected; the new `/api/mcp-users` endpoint uses the same auth.

---

## Suggested Files

| File / Layer | Purpose |
|--------------|--------|
| `src/admin/mcp-users-store.ts` (or under existing store) | Upsert user, list users with last_used_at |
| `src/server/` or session layer | Read `X-MCP-User-Name` (or param), call store to update last usage |
| `docs/architecture.md` | MCP user tracking and header convention |
| `docs/requirements.md` | Header name and optional config |
| Panel: new route + component | e.g. `app/mcp-users/page.tsx` (or equivalent), table component |
| Panel: API route | e.g. `app/api/mcp-users/route.ts` → calls Hub or shared store |

---

## Notes

- This phase does not require authentication of the MCP client; the “user name” is whatever the client sends in the header. It is for visibility and usage tracking only.
- If the same person connects from different clients with different names, they will appear as separate rows; that is acceptable for a first version.
- Later enhancements could include: merging by user id, retention policy (e.g. delete users not seen for 90 days), or export to CSV.
