# Phase 03 — Skills Registry & Dynamic Skills

## Goal

Implement the skills layer: a skills registry, each skill defined (name, description, input schema, handler), and execution through a unified format so the client can call them as higher-level tools.

---

## Expected Outputs

- Skills registry: register skills by name, description, and input schema
- Handler execution for each skill that coordinates multiple tool calls (from Phase 02) or other steps
- Server exposes skills as “tools” (or a separate capability per design) so the AI can request them
- Ability to add a new skill via a file + registration without changing the server core

---

## Sub-tasks

### 3.1 Skill definition model

- [ ] Unify the skill shape:
  - `name`: unique id (e.g. `create_api_endpoint`, `generate_crud`)
  - `description`: text for the AI describing what the skill does and expected inputs
  - `inputSchema`: JSON Schema for parameters
  - `handler`: async function that receives parameters, runs the sequence, and returns a result
- [ ] TypeScript type for skills in `src/types/skills.ts` (or similar)

### 3.2 Skills registry

- [ ] Create a central registry (e.g. `src/skills/registry.ts`):
  - `registerSkill(skill)`: add a skill
  - `getSkill(name)`: get skill by name
  - `getAllSkills()`: list all skills (for display or tools/list)
  - Load skills from `src/skills/` folder or from an explicit list in code
- [ ] Discovery or loading from files in `src/skills/` (e.g. `*-skill.ts` files imported and registered automatically)

### 3.3 Example skills (at least one)

- [ ] Implement one full skill, e.g. **create_api_endpoint**:
  - Inputs: endpoint name, path, method (GET/POST/…), optional fields
  - Steps (inside the handler):
    1. Create controller file (via create_file or internal call)
    2. Create or update route file
    3. Update Swagger/OpenAPI if present
    4. (optional) Run code generation script
  - Result: success message or list of created files
- [ ] (optional) A second simple skill, e.g. **generate_crud** or **create_react_page**, to verify reuse

### 3.4 Exposing skills to the client

- [ ] Design decision: skills appear as tools in `tools/list` (with a distinct name like `skill:create_api_endpoint`) or as a separate capability (e.g. `skills/list` and `skills/call`)
- [ ] Implement the choice:
  - If as tools: merge the skills list with the tools list in the `tools/list` response, and in `tools/call` use prefix or field to identify the skill and call the right handler
  - If separate: implement endpoints or MCP requests for skills only
- [ ] Document the decision in this file or in `docs/architecture.md`

### 3.5 Skill execution and error handling

- [ ] On skill call: load the handler, run it with the parameters, return the result
- [ ] On failure of a step inside the skill: clear error message, no leaked resources (rollback or cleanup if possible)
- [ ] (optional) Maximum execution time (timeout) for a skill to avoid hangs

### 3.6 Documentation and extensibility

- [ ] Document in `docs/` or in code comments how to add a new skill (new file + registration)
- [ ] Template or commented example for a new skill file

---

## Completion Criteria

- The skills registry returns the defined skills
- Calling at least one skill runs the full sequence (multiple tools/steps) and returns a correct result
- Adding a new skill = add handler + register (no change to server core or MCP server logic)

---

## Dependencies

- **Phase 02** complete (tool layer exists and can be called from inside skills).

---

## Suggested Files

| File | Purpose |
|------|---------|
| `src/types/skills.ts` | Skill definition type and handler |
| `src/skills/registry.ts` | Skills registry and loading |
| `src/skills/create-api-endpoint.ts` | create_api_endpoint skill |
| `src/skills/index.ts` | Export registry and load skills |
| `docs/skill-template.md` or comment in example | Template for adding a new skill |

---

## Notes

- Skills do not replace tools; they are a higher layer that calls tools (and later possibly plugin tools).
- Phase 05 will define how skill requests are merged with local tools and plugins in a single routing layer.
