# Phase 06 — Extensions & Future

## Goal

Document planned extensions and future scenarios without requiring immediate implementation, and prepare structure and docs so they can be implemented later without major redesign.

---

## Expected Outputs

- List of suggested extensions with priorities (optional)
- Short doc per extension: goal, requirements, dependencies, suggested steps
- (optional) Reminder for quality improvements: tests, monitoring, security, versions

**Index, priorities, and quality reminder:** [docs/future/README.md](../future/README.md) and [docs/future/quality.md](../future/quality.md).

---

## Suggested Extensions (for the future)

### 6.1 Project scaffolding — Priority 1

- **Goal**: Skill or set of skills to create a new project structure (e.g. Next.js, API, library)
- **Requirements**: Templates or generators, create_file tool and possibly CLI calls
- **Dependencies**: Phase 02, 03, 05
- **Suggested steps**: (to be detailed when starting)

### 6.2 Database schema generation — Priority 2

- **Goal**: Skill that takes a description (e.g. entities/relations) and generates migrations or schema
- **Requirements**: DB tool or integration (e.g. query or migration runner), may need external plugin
- **Dependencies**: Phase 02, 03, 05
- **Suggested steps**: (to be detailed later)

### 6.3 Frontend page generation — Priority 3

- **Goal**: Skill to create a page or UI component (e.g. React) from description or Figma
- **Requirements**: File tools, possibly design or component generator plugin
- **Dependencies**: Phase 02, 03, 04, 05
- **Suggested steps**: (to be detailed later)

### 6.4 Deployment automation — Priority 4

- **Goal**: Skills or tools to trigger deploy, check status, or rollback
- **Requirements**: Integration with CI/CD or deploy APIs, high security (allowlist, verification)
- **Dependencies**: Phase 02, 03, 05
- **Suggested steps**: (to be detailed later)

### 6.5 Internal company tools — Priority 5

- **Goal**: Company-specific tools or skills (internal queries, reports, etc.)
- **Requirements**: Custom config, possibly internal MCP plugin or APIs
- **Dependencies**: Phase 02, 03, 04, 05
- **Suggested steps**: (to be detailed later)

---

## Quality Improvements (ongoing or later)

For details and reminder: [docs/future/quality.md](../future/quality.md).

- [ ] **Testing**: Unit and integration for tools, skills, and routing; E2E with MCP client
- [ ] **Monitoring and logging**: Log tool/skill calls, errors, and execution time (for diagnostics without leaking sensitive data)
- [ ] **Security**: Review file and command permissions, allowlists for NPX plugins, no secrets in logs
- [ ] **Versions**: Support specific NPX plugin versions in config (e.g. `package@1.2.3` instead of `@latest`) for stability
- [ ] **Documentation**: Update README and docs with each phase; keep tool and skill lists up to date (manually or automatically)

---

## Completion Criteria (for this phase)

- Every future extension is described in one document (this file or under `docs/future/`) with goal, requirements, and dependencies
- No requirement to implement code in Phase 06 — the phase is documentation and planning

---

## Dependencies

- **Phase 00–05** complete; the system works as a unified Company MCP Hub.

---

## Notes

- Each extension can later be split into sub-phases (6.1.1, 6.1.2, …) when implementation starts.
- Prefer updating this file when adding a new extension idea so it stays the single reference for the future.
