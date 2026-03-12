# Phase 05 — Integration & Routing

## Goal

Integrate all sources (local tools, skills, external plugin tools) under one interface and route `tools/list` and `tools/call` requests to the correct source by tool name or the defined convention.

---

## Expected Outputs

- Single unified response for `tools/list` combining local server tools + skills (if exposed as tools) + each external plugin’s tools
- Correct routing for `tools/call`: determine source (local / skill / plugin), execute the request, return the result
- Naming convention or prefixes to avoid name clashes between sources (e.g. `plugin:next-devtools/run_build` or unique names)
- Consistent error behaviour (plugin unavailable, tool not found, timeout)

---

## Sub-tasks

### 5.1 Naming convention and sources

- [ ] Define how tools are exposed to the client:
  - Local tools: direct names (e.g. `create_file`, `run_command`)
  - Skills: either direct names (e.g. `create_api_endpoint`) or prefix (e.g. `skill:create_api_endpoint`) to distinguish them
  - Plugins: prefix or namespace (e.g. `next-devtools:run_build` or `plugin/next-devtools/run_build`) to avoid clashes
- [ ] Document the convention in `docs/architecture.md` or in this file
- [ ] Create a map or table: tool name → source (local | skill | plugin id)

### 5.2 Merging tool lists

- [ ] On `tools/list` request:
  - Collect local layer tools (Phase 02)
  - Collect skills defined as tools (Phase 03)
  - Collect each loaded external plugin’s tools (Phase 04), renaming or adding prefix per convention
  - Return a single list with no duplicate names
- [ ] Ensure description and input schema remain correct for each tool after merge

### 5.3 Routing tool calls (tools/call)

- [ ] On `tools/call` request (tool name + arguments):
  - Determine source from the name (local / skill / plugin)
  - **Local tool**: call local registry (Phase 02)
  - **Skill**: call skill handler from registry (Phase 03)
  - **External plugin**: send request to the right plugin client (Phase 04) and return the result
- [ ] Error handling:
  - Tool not found: clear message
  - Plugin unavailable or disconnected: appropriate message without crashing the server
  - Timeout: return error after the limit

### 5.4 Skills using tools from multiple sources (optional advanced)

- [ ] If desired: allow a skill handler to call tools from plugins (e.g. filesystem + next-devtools + git) from within the same skill
- [ ] Implement via a unified interface (e.g. `executeTool(name, args)`) used by the handler and routed by the Hub to the correct source
- [ ] Document an example skill that uses local tools + a plugin tool

### 5.5 Testing and integration

- [ ] Test from MCP client: `tools/list` returns all tools (local + skills + plugins)
- [ ] Test calling a tool from each source and verify the result
- [ ] Test scenario: plugin unavailable or failed call — verify error message and that the Hub does not crash

---

## Completion Criteria

- A single client (e.g. Cursor) sees one unified list of all capabilities (tools + skills + plugins)
- Calling any registered tool runs from the correct source and returns the result or a clear error
- Naming convention is documented and consistent in the code

---

## Dependencies

- **Phase 01**: Server runs
- **Phase 02**: Local tools registered
- **Phase 03**: Skills registered and callable
- **Phase 04**: Plugins loaded and available for list/call

---

## Suggested Files

| File | Purpose |
|------|---------|
| `src/server/routing.ts` or `src/router.ts` | Logic to determine source and route tools/list and tools/call |
| `src/types/routing.ts` | Tool source type and routing map |
| `docs/architecture.md` | Naming convention and integration description |

---

## Notes

- This phase is the “glue” between all layers; keep it clear and extensible when adding a new source (e.g. another type of plugin).
