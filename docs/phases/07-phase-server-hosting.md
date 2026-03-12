# Phase 07 — Server Hosting

## Goal

Run the Hub as a network service reachable over HTTP (or SSE) instead of stdio only, so developers and processes can connect to the same hosted Hub on a single server.

---

## Expected Outputs

- Hub supports **Streamable HTTP** or **SSE** transport (in addition to or instead of stdio per config).
- Hub runs as a long-lived process listening on a port (e.g. 3000) or behind a reverse proxy.
- Any MCP client (e.g. Cursor when it supports HTTP) can connect to the server URL and get the same `tools/list` and `tools/call`.
- Documentation for running the server (environment variables, port, etc.).

---

## Sub-tasks

### 7.1 Choose network transport

- [ ] Choose a transport supported by the SDK: **Streamable HTTP** (recommended) or **SSE**.
- [ ] Review `@modelcontextprotocol/sdk` docs for Server with Streamable HTTP / SSE.
- [ ] Define a new entry point (e.g. `src/server/http-entry.ts` or a branch in `index.ts`) to start the server with the chosen transport.

### 7.2 Implement HTTP/SSE entry point

- [ ] Create or adapt the server to accept connections on a path (e.g. `/mcp` or `/sse`).
- [ ] Attach the same Hub logic (createServer, tools, skills, plugins) to the network transport.
- [ ] Lifecycle: clean shutdown on SIGTERM, no open connections left behind.

### 7.3 Config and running

- [ ] Environment variables (e.g. `PORT`, `MCP_TRANSPORT=http`, `BASE_URL`).
- [ ] Run script for production (e.g. `npm run start:server` or `node dist/server/http-entry.js`).
- [ ] Document in `docs/requirements.md` or `docs/deployment.md`: how to host the service (Node directly, PM2, Docker, behind reverse proxy).

### 7.4 Client compatibility (Cursor and others)

- [ ] Document how a developer adds the hosted Hub URL in Cursor (or another client) if the client supports HTTP.
- [ ] If Cursor currently supports stdio only: document that hosting serves other clients or future use.

---

## Completion Criteria

- Hub runs on a given port and responds to MCP requests over HTTP/SSE.
- A test client connects to the URL and receives `tools/list` and can call a tool successfully.
- Clear documentation for running and configuration.

---

## Dependencies

- **Phase 00–06** complete (Hub runs on stdio with tools, skills, plugins, and routing).

---

## Suggested Files

| File | Purpose |
|------|---------|
| `src/server/http-entry.ts` or `server-http.ts` | Entry point to start server with HTTP/SSE transport |
| `src/config/transport.ts` (optional) | Choose transport from config (stdio vs http) |
| `docs/deployment.md` (optional) | Running and hosting the Hub in production |

---

## Notes

- Keep stdio support for local use (local Cursor) if possible.
- Security: when exposed to the network, consider HTTPS and possibly authentication (to be detailed later or in Phase 09 with roles).
