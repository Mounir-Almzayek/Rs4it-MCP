# Company MCP Platform — Documentation

This folder contains the project documentation and implementation phases.

## Contents

| Folder / File | Description |
|---------------|-------------|
| **[evolution-roadmap.md](evolution-roadmap.md)** | Evolution roadmap: server hosting, admin panel, roles, authentication (Phase 07–10) |
| **phases/** | Implementation phases: 00–06 (foundation) then 07–11 (hosting, panel, roles, panel auth, MCP users tracking) — follow in order |
| **[architecture.md](architecture.md)** | Design decisions (exposing skills as tools with `skill:` prefix) and layers |
| **[skill-template.md](skill-template.md)** | Template for adding a new skill without changing the server core |
| **[skill-authoring-ux-and-compiler.md](skill-authoring-ux-and-compiler.md)** | Cursor-like skill authoring UX + internal Skill Compiler (hybrid approach) — phased implementation plan |
| **[security.md](security.md)** | Tool security policy (workspace, blocklist) |
| **[requirements.md](requirements.md)** | Runtime requirements and environment variables |
| **[deployment.md](deployment.md)** | Hosting the Hub over HTTP in production (Phase 07) |
| **[admin-auth.md](admin-auth.md)** | Panel authentication (Phase 10): login, credential change, SESSION_SECRET |
| **admin/** (separate project) | Phase 08 admin panel — Next.js, managing Tools + Skills + Plugins |
| **future/** | Future extensions (index, priorities) and quality improvement reminders — [future/README.md](future/README.md) |

## Phase Order

Phases are designed to be executed in order because each phase depends on the previous one.

### Foundation (00–06) — Complete

1. **[00 - Overview & Setup](phases/00-overview-and-setup.md)** — Overview, requirements, and project setup
2. **[01 - MCP Server Layer](phases/01-phase-mcp-server.md)** — Server layer and entry point
3. **[02 - Tool Layer](phases/02-phase-tool-layer.md)** — Atomic tools layer
4. **[03 - Skills Registry & Dynamic Skills](phases/03-phase-skills-registry.md)** — Skills registry and dynamic skills
5. **[04 - External MCP Plugins & NPX](phases/04-phase-external-plugins.md)** — External plugins and running them via NPX
6. **[05 - Integration & Routing](phases/05-phase-integration-routing.md)** — Integration and request routing
7. **[06 - Extensions & Future](phases/06-phase-extensions-future.md)** — Extensions and future scenarios

### Evolution (07–11) — Hosting, panel, roles, auth, MCP users

See **[evolution-roadmap.md](evolution-roadmap.md)** for context and goals.

8. **[07 - Server Hosting](phases/07-phase-server-hosting.md)** — Hosting the Hub on a server (HTTP/SSE)
9. **[08 - Admin Panel](phases/08-phase-admin-panel.md)** — Admin panel for Tools + Skills + Plugins
10. **[09 - Roles & Visibility](phases/09-phase-roles-and-visibility.md)** — Roles and tool filtering (useful for Cursor)
11. **[10 - Admin Authentication](phases/10-phase-admin-authentication.md)** — Secure panel authentication (login, API protection, credential change)
12. **[11 - MCP Users Tracking](phases/11-phase-mcp-users-tracking.md)** — Register MCP connector name (header), track last usage, panel tab with users table

## Corresponding Code Structure

```
rs4it mcp/
├── docs/              ← You are here
│   ├── evolution-roadmap.md   ← Roadmap for 07–09
│   ├── phases/        ← 00–11
│   └── future/
├── src/
│   ├── server/        ← Phase 01, 07 (http-entry)
│   ├── tools/         ← Phase 02
│   ├── skills/        ← Phase 03
│   ├── plugins/       ← Phase 04
│   ├── config/        ← Phase 01, 05
│   ├── types/         ← Shared, Phase 09 (roles)
│   └── admin/         ← Phase 08 (panel/dynamic config)
└── config/            ← Runtime config (plugins, etc.)
```

---

*Last updated: per implementation phases in `phases/`*
