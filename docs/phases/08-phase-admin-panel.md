# Phase 08 — Admin Panel

## Goal

Provide a management UI (web) that allows adding, editing, and deleting **Tools**, **Skills**, and **External MCP Plugins** without changing code or redeploying the Hub, so changes are flexible and available from one place.

---

## Expected Outputs

- Web application (panel) that system admins or developers can access.
- From the panel: manage **tools** (add a new tool with description, input schema, and execution binding, or enable/disable existing tools).
- From the panel: manage **skills** (add a new skill with description, schema, and handler or template binding, or enable/disable).
- From the panel: manage **external MCP plugins** (add/edit/delete config entries: id, command, args, etc.).
- Changes are stored in dynamic config (database or config files updated by the panel) and the Hub reads them and updates the tool list without restart (or on reload when requested).

---

## Sub-tasks

### 8.1 Storage model for dynamic config

- [ ] Decide where config is stored: database (SQLite, PostgreSQL, etc.) or JSON files updated by the panel.
- [ ] Define a data model for manageable tools, skills, and plugins (fields aligned with the current Hub).
- [ ] Interface or layer (e.g. `src/admin/store.ts`) to read/write this config.

### 8.2 API for the panel

- [ ] Endpoints (REST or other) for the panel: read lists of tools/skills/plugins, add, edit, delete.
- [ ] Protect these endpoints (auth/permissions) so only admins or authorized users can access them.
- [ ] On change: either notify the Hub to reload config, or the Hub reads from the shared source on every `tools/list` (per design).

### 8.3 Wiring the Hub to dynamic config

- [ ] Hub reads the list of tools, skills, and plugins from the config source (in addition to or instead of built-in ones in code).
- [ ] Load mechanism: at startup and/or on notification from the panel (webhook or polling) to reload config.
- [ ] “Dynamic” tools/skills: executed via template code (e.g. skill that runs a sequence of tools defined in config) or by binding a pre-registered handler by name.

### 8.4 User interface (panel)

- [ ] Screens for: tool list (with add/edit/delete), skills list, external plugins list.
- [ ] Suitable input forms (name, description, input schema, run command for plugins, etc.).
- [ ] (optional) Quick preview of `tools/list` as the client sees it.

### 8.5 Documentation and security

- [ ] Document how to access the panel and manage permissions.
- [ ] Do not expose the panel API or UI to the internet without proper authentication.

---

## Completion Criteria

- From the panel, tool, skill, and plugin entries can be added/edited/deleted.
- The Hub reflects these changes (within an acceptable delay) and returns an updated `tools/list`.
- Calling a tool/skill/plugin added from the panel works successfully.

---

## Dependencies

- **Phase 07** preferred (Hub hosted on a server) so panel and Hub share an environment; the panel can theoretically run locally against a local Hub for testing.

---

## Suggested Files

| File / Folder | Purpose |
|---------------|---------|
| `src/admin/` or separate project `admin/` | Config storage and/or panel API logic |
| `src/config/dynamic-config.ts` (or similar) | Read tools/skills/plugins config from dynamic source |
| Panel UI | Web project (React, Vue, etc.) or simple pages that call the panel API |

---

## Notes

- The panel can be built as part of the same repo or as a separate app that talks to the Hub API or a shared database.
- Tools/skills added from the panel may be “templates” (sequence of existing tools) at first; running arbitrary code from the panel requires additional security mechanisms.
