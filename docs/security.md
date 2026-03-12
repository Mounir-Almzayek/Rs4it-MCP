# Security Policy — MCP Tools and Plugins (Phase 02 + 04)

## Tool Execution Limits

### Files (create_file, read_file)

- **Workspace root**: All file paths are resolved within a single root only.
- **Setting the root**:
  - Environment variable `MCP_WORKSPACE_ROOT`: if set and present, it is used as the root.
  - Otherwise `process.cwd()` at server start is used.
- **Validation**: Any path that tries to escape the root (e.g. `../` outside the root) is rejected with an error message.

### Commands (run_command)

- **Blocklist**: Certain commands or patterns are always forbidden, including:
  - `rm -rf` / `rm -r` / `rm --recursive` / `rm --force`
  - `sudo`
  - `mkfs.*`
  - Dangerous redirection to devices (e.g. `>/dev/sda`)
- **Timeout**: Default 60 seconds, optionally between 100 ms and 300000 ms (5 minutes).
- **Working directory**: If provided, must be inside the workspace (same rules as for files).

## Input Validation

- Every tool has an input schema (Zod) validated by the MCP server before execution.
- Requests that do not match the schema are rejected and never reach the handler.

## Adding New Tools

- Adding a new tool = defining the tool + handler + calling `registerTool` in the registry (e.g. from `src/tools/index.ts`).
- This does not require changing the server core.
- New tools should respect the same workspace and command limits when designed.

---

## External Plugins (Phase 04)

- **NPX**: The default command to run a plugin is `npx -y <package>@latest` (or a version specified in config). Command and arguments come from `config/mcp_plugins.json`.
- **Allowlist (optional)**: A list in config or an environment variable can later restrict allowed packages to reduce the risk of running arbitrary packages.
- **Local path (optional)**: Config supports arbitrary `command` and `args`; to run a plugin from a local path use e.g. `"command": "node", "args": ["./local-plugin/index.js"]`.
- If a plugin fails to start or initialize: the error is logged and the Hub does not crash; calling a tool from an unavailable plugin returns a clear message to the client.
