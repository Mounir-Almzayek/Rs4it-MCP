# Project Structure — Company MCP Platform

This file describes the folder and file structure **without code** — only the layout and purpose of each part.

---

## Full Tree

```
rs4it mcp/
├── README.md                    # Overview and quick start
├── PROJECT-STRUCTURE.md         # This file — structure explanation
│
├── docs/                        # Documentation
│   ├── README.md                # Docs index and phase order
│   └── phases/                  # Implementation phases
│       ├── 00-overview-and-setup.md
│       ├── 01-phase-mcp-server.md
│       ├── 02-phase-tool-layer.md
│       ├── 03-phase-skills-registry.md
│       ├── 04-phase-external-plugins.md
│       ├── 05-phase-integration-routing.md
│       └── 06-phase-extensions-future.md
│
├── src/                         # Source code (added later per phases)
│   ├── server/                  # Phase 01 — MCP Server Layer
│   ├── tools/                   # Phase 02 — Tool Layer
│   ├── skills/                  # Phase 03 — Skill Layer
│   ├── plugins/                 # Phase 04 — External Plugins Loader
│   ├── config/                  # Internal config loading
│   └── types/                   # Shared TypeScript types
│
└── config/                      # Runtime config (e.g. mcp_plugins.json)
```

---

## Purpose of Each Folder

| Path | Phase | Purpose |
|------|-------|---------|
| `src/server/` | 01 | Entry point, MCP init, receive and route requests |
| `src/tools/` | 02 | Define and implement atomic tools (create_file, run_command, etc.) |
| `src/skills/` | 03 | Skills registry and composite workflow handlers |
| `src/plugins/` | 04 | Run external MCP plugins via NPX and communicate (stdio) |
| `src/config/` | 01, 05 | Load constants and config (server name, plugins config, etc.) |
| `src/types/` | Shared | Interfaces and types for tools, skills, routing, plugins |
| `config/` | 04 | Editable config files (e.g. plugin list and NPX commands) |
| `docs/phases/` | — | Detailed implementation phases for later execution |

---

## Phases and Their Relation to Folders

- **Phase 00**: Project setup (package.json, tsconfig, dependencies) — no new folders.
- **Phase 01**: `src/server/`, `src/config/`, `src/types/`.
- **Phase 02**: `src/tools/`, extend `src/types/`.
- **Phase 03**: `src/skills/`, extend `src/types/`.
- **Phase 04**: `src/plugins/`, `config/` (plugins config file).
- **Phase 05**: Unified routing (may live in `src/server/` or `src/router.ts`).
- **Phase 06**: Future extensions documentation — no mandatory new structure.

---

*This file is updated when new folders or phases are added.*
