# Phase 02 — Tool Layer

## Goal

Implement the atomic tools layer: define and implement simple, reusable tools and register them with the server so `tools/list` exposes them and `tools/call` runs them.

---

## Expected Outputs

- A set of base tools with defined interface and input schema
- Actual implementation (handler) for each tool
- Tools registered with the server so the client can discover and call them
- A pattern for adding new tools later without changing the server core

---

## Sub-tasks

### 2.1 Tool definition model

- [ ] Unify the tool shape in code:
  - `name`: unique id (e.g. `create_file`, `run_command`)
  - `description`: text explaining to the AI what the tool does
  - `inputSchema`: JSON Schema for parameters (e.g. path, content for create_file)
- [ ] TypeScript type for each tool (in `src/types/`) and single source of truth for name and schema

### 2.2 Suggested base tools (choose a set to implement first)

Implement at least 2–3 tools to validate the layer; the rest can be added later:

- [ ] **create_file**
  - Inputs: file path, content (and optional encoding)
  - Behaviour: create a file at the given path (within safe bounds, e.g. inside workspace)
  - Errors: path outside workspace, permissions, etc.

- [ ] **run_command**
  - Inputs: command (single line or array), optional working directory, optional timeout
  - Behaviour: run a shell command (with allowlist if needed)
  - Errors: timeout, disallowed command, non-zero exit code

- [ ] **read_file** (optional)
  - Inputs: file path
  - Behaviour: read file content and return it
  - Errors: file not found, outside workspace

Later: `query_database`, `call_internal_api`, `git_commit`, etc.

### 2.3 Register tools with the server

- [ ] Create a central tool registry (e.g. `src/tools/registry.ts`):
  - Register each tool by name, description, and input schema
  - Function `getAllTools()` returns the list for `tools/list`
  - Functions `getTool(name)` and `executeTool(name, args)` for `tools/call`
- [ ] Wire the registry to the server’s request handler (Phase 01) so that:
  - `tools/list` returns all registered tools
  - `tools/call` calls `executeTool` and returns the result or an appropriate error

### 2.4 Safety and limits

- [ ] Define execution limits for tools:
  - Files: only within project root (workspace root) or a path defined in config
  - Commands: allowlist or warning for dangerous commands (rm -rf, etc.)
- [ ] Validate inputs against the schema before execution and reject invalid requests
- [ ] Document the security policy in `docs/` or in this file

### 2.5 Testing

- [ ] Test each tool in isolation (unit or integration)
- [ ] Test from an MCP client: call each registered tool and verify the result

---

## Completion Criteria

- `tools/list` returns a list containing the implemented tools
- `tools/call` runs each tool correctly and returns content or a clear error message
- Adding a new tool = add definition + handler + register in the registry without changing the server core

---

## Dependencies

- **Phase 01** complete (server receives requests and routes them to tools/list and tools/call).

---

## Suggested Files

| File | Purpose |
|------|---------|
| `src/types/tools.ts` | Tool definition type and input schema |
| `src/tools/registry.ts` | Tool registration and invocation |
| `src/tools/create-file.ts` | create_file tool |
| `src/tools/run-command.ts` | run_command tool |
| `src/tools/read-file.ts` | (optional) read_file tool |
| `src/tools/index.ts` | Export registry and tools |

---

## Notes

- Tools should stay small and deterministic where possible; complexity belongs in skills (Phase 03).
- Any dependency on the file system or shell should be isolated behind a single interface for testing and security.
