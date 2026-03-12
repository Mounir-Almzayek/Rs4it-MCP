# Phase 01 — MCP Server Layer

## Goal

Build the core server layer: an entry point that accepts an MCP client connection (e.g. Cursor), introduces the server and its capabilities, without executing tools, skills, or plugins yet.

---

## Expected Outputs

- MCP Server process runnable via stdio (or the chosen transport)
- Server registration and exposure of name and capabilities to the client
- Correct handling of `initialize` and `initialized` requests per the spec
- Structure that allows adding tools (Phase 02), skills (Phase 03), and plugins (Phase 04) later

---

## Sub-tasks

### 1.1 Choose MCP library and transport

- [ ] Install and use the server library (e.g. `@modelcontextprotocol/sdk`)
- [ ] Choose transport: **stdio** (default for Cursor and others) or SSE if required
- [ ] Create the main entry point (e.g. `src/server/index.ts`) that:
  - Reads from stdin and writes to stdout when using stdio
  - Does not register any tools, skills, or plugins yet

### 1.2 Server initialization (Initialize)

- [ ] Handle `initialize` request:
  - Return `serverInfo`: server name and version (e.g. `company-mcp-hub`, `0.1.0`)
  - Return `capabilities` per the spec (e.g. tools list later)
- [ ] Send `initialized` response after successful initialization
- [ ] Document version and server name in one place (e.g. `src/config/constants.ts` or `package.json`)

### 1.3 Tool registration structure (for later use)

- [ ] Define an interface or type (in `src/types/`) for a single tool:
  - Name, description, input schema
- [ ] Prepare a registration mechanism (registry or list) for tools in the server — can be empty or register one test tool for verification
- [ ] On client `tools/list`: return the registered list (even if empty or test)
- [ ] On client `tools/call`: prepare a handler that receives tool name and arguments — actual execution in Phase 02

### 1.4 Lifecycle management

- [ ] Handle client disconnect (stdin close or shutdown signal) and stop the server cleanly
- [ ] Avoid resource leaks (no orphan processes or open sockets)

### 1.5 Running and testing

- [ ] Run script: `npm run start` or `node dist/index.js` starts the server and listens on stdio
- [ ] Manual or automated test: MCP client sends `initialize` and receives the correct response; `tools/list` returns a list (empty or test)

---

## Completion Criteria

- The client (e.g. Cursor) can connect to the server and get a successful initialization
- `tools/list` returns a valid structure (even without real tools yet)
- No actual tools, skills, or external plugins are required in this phase

---

## Dependencies

- **Phase 00** complete (project set up, dependencies present, structure ready).

---

## Suggested Files

| File | Purpose |
|------|---------|
| `src/server/index.ts` | Entry point, create server and attach transport |
| `src/server/server.ts` or `server.js` | MCP initialization and basic request handling |
| `src/types/tools.ts` (or similar) | Tool interface type and input schema |
| `src/config/constants.ts` (optional) | Server name, version, default capabilities |

---

## Notes

- Keep tool and skill logic outside the server layer; the server only routes requests.
- Later (Phase 05) `tools/call` routing will be wired to local tools, skills, and plugins.
