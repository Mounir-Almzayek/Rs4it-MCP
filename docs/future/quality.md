# Quality Improvements (Ongoing or Later)

Reminder of quality items that can be done after Phase 00–05. Not mandatory to implement in Phase 06.

---

## Testing

- [ ] **Unit**: Test each tool (create_file, read_file, run_command) in isolation.
- [ ] **Integration**: Test registry, skills, and routing (router, callPluginTool).
- [ ] **E2E**: Test with an MCP client (e.g. Cursor or test client) — tools/list and tools/call from every source.

---

## Monitoring and Logging

- [ ] Log tool and skill calls (name, success/failure, duration) for diagnostics.
- [ ] Log plugin errors and reconnection without leaking sensitive data or secrets in logs.

---

## Security

- [ ] Review file permissions (workspace, resolveWithinWorkspace) and commands (blocklist, allowlist).
- [ ] Allowlists for allowed NPX packages (if any).
- [ ] Do not leak secrets or tokens in logs or error messages.

---

## Versions

- [ ] Support specific versions of NPX plugins in config (e.g. `package@1.2.3` instead of `@latest`) for stability.

---

## Documentation

- [ ] Update `README` and `docs/` with each phase or extension.
- [ ] Keep the list of tools, skills, and plugins up to date (manually or automatically).
