# Phase 00 — Overview & Setup

## Goal

Set up the project environment and dependencies without writing MCP Hub logic, and ensure a clear project structure ready for implementation.

---

## Expected Outputs

- Node.js/TypeScript project ready for development
- Folder structure as in the architecture report
- Dependency files (package.json) with appropriate versions
- Quick reading guide for the following phases

---

## Sub-tasks

### 0.1 Choose runtime and language

- [ ] Decide: Node.js (supported LTS version, e.g. 20.x)
- [ ] Decide: TypeScript for the entire project
- [ ] Document requirements in `README.md` or `docs/requirements.md`

### 0.2 Initialize the project

- [ ] Create or update `package.json`:
  - Project name (e.g. `company-mcp-hub` or `rs4it-mcp`)
  - Project type: `"type": "module"` if using ES Modules
  - Scripts: `build`, `start`, `dev`
- [ ] Add `tsconfig.json` with suitable settings (target, module, outDir, strict)
- [ ] Do not add actual MCP code in this phase — structure only

### 0.3 Core dependencies (no MCP code yet)

- [ ] Choose and document the official MCP Server library:
  - e.g. `@modelcontextprotocol/sdk` (or company-approved alternative)
- [ ] Add as dev dependencies:
  - `typescript`
  - Build tool such as `tsup`, `esbuild`, or `tsc`
  - Run tool such as `tsx` for development
- [ ] Document planned dependencies in `docs/phases/00-overview-and-setup.md` or in a table in the README

**Phase 00 dependencies (applied):**

| Package | Type | Usage |
|---------|------|--------|
| `@modelcontextprotocol/sdk` | dependency | MCP server (Phase 01+) |
| `typescript` | devDependency | Build and types |
| `tsx` | devDependency | Run TS during development |

### 0.4 Final folder structure

Ensure the following folders exist (empty or with `.gitkeep` only):

```
rs4it mcp/
├── docs/
│   ├── README.md
│   └── phases/
│       ├── 00-overview-and-setup.md
│       ├── 01-phase-mcp-server.md
│       ├── 02-phase-tool-layer.md
│       ├── 03-phase-skills-registry.md
│       ├── 04-phase-external-plugins.md
│       ├── 05-phase-integration-routing.md
│       └── 06-phase-extensions-future.md
├── src/
│   ├── server/      # MCP Server Layer
│   ├── tools/       # Tool Layer
│   ├── skills/      # Skill Layer
│   ├── plugins/     # Plugin Loader & communication
│   ├── config/      # Internal config loaders
│   └── types/       # Shared TypeScript types
├── config/          # Runtime config (e.g. mcp_plugins.json)
├── package.json
└── tsconfig.json
```

- [ ] Verify each folder exists and its purpose is documented in this file or in `docs/README.md`

### 0.5 Documentation and references

- [ ] Add file `docs/requirements.md` (optional) summarizing:
  - Required Node.js version
  - Environment variables if any
  - How to run the server later (e.g. stdio vs SSE)
- [ ] In the main README, point to implementation phases in `docs/phases/` and that order matters

---

## Completion Criteria

- `npm install` and `npm run build` run (even if the build does not produce a real executable yet)
- No MCP code, tools, or skills — only structure, dependencies, and documentation
- Any developer opening the project understands from the README and `docs/` where to start (Phase 00 then 01, 02, ...)

---

## Dependencies

- None on other phases (this is the first phase).

---

## Notes

- ESLint, Prettier, and tests can be added later at the end of Phase 00 or in a separate phase.
- Configuring Cursor or any MCP client to connect to the server is done after Phase 01/05.
