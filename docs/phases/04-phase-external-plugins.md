# Phase 04 — External MCP Plugins & NPX

## Goal

Enable the Hub to load and communicate with external MCP plugins (e.g. next-devtools-mcp, filesystem-mcp, github-mcp), running them dynamically via **NPX** to use the latest version without a permanent install.

---

## Expected Outputs

- Config file describing external plugins (name, run command, arguments)
- Loader that reads config and starts each plugin as a subprocess (e.g. `npx -y package-name@latest`)
- Communication with each plugin via **stdio** (or the transport defined per plugin)
- Routing of tool requests to the right plugin (or merging tool lists) — full details in Phase 05

---

## Sub-tasks

### 4.1 External plugins config

- [ ] Define config format (e.g. `config/mcp_plugins.json` or inside `config/default.json`):
  - Per plugin: `id`, `name`, `command` (e.g. `npx`), `args` (e.g. `["-y", "next-devtools-mcp@latest"]`)
  - (optional) `cwd`, `env`, `timeout`
- [ ] Create a sample config with 1–2 plugins (e.g. next-devtools-mcp or a light one for testing)
- [ ] Load config at server start from a fixed path or environment variable (e.g. `MCP_PLUGINS_CONFIG`)

### 4.2 Plugin loader — running processes

- [ ] Implement **Plugin Loader** (e.g. in `src/plugins/loader.ts`):
  - Read plugin list from config
  - For each plugin: start a subprocess (child_process) with command and args (e.g. `npx -y package@latest`)
  - Connect process stdin/stdout to MCP transport (stdio) for communication with the plugin
- [ ] Lifecycle: stop processes when the Hub shuts down, no orphan processes
- [ ] (optional) Restart a plugin on crash or configurable reconnect attempts

### 4.3 Communicating with the plugin (MCP client per plugin)

- [ ] Treat each plugin as a **subordinate MCP Server**; the Hub is an **MCP client** to it
- [ ] Perform initialize exchange with each plugin at startup and fetch its tool list
- [ ] Store each plugin’s tool list (with prefix or plugin id to avoid name clashes)
- [ ] On request to run a tool that belongs to a plugin: send `tools/call` to that plugin via stdio and return the result

### 4.4 NPX and run safety

- [ ] Document that the default command is `npx -y package@latest` (or version from config)
- [ ] Allowlist for allowed NPX packages if possible (to reduce risk of running arbitrary packages)
- [ ] (optional) Support running a plugin from a local path (e.g. `node ./local-plugin`) for internal setups

### 4.5 Errors and limits

- [ ] On plugin start failure: log the error and do not crash the Hub; return a clear message to the client when calling a tool from an unavailable plugin
- [ ] (optional) Timeout for plugin initialization and for tool call requests

---

## Completion Criteria

- On Hub start, plugins listed in config are run via NPX and connected via stdio
- Plugin tool lists are available to the Hub (for merge or routing in Phase 05)
- Calling a tool from a plugin works and returns the result (after routing is wired in Phase 05)
- Closing the Hub stops all plugin processes cleanly

---

## Dependencies

- **Phase 01** complete (server runs and receives requests)
- **Phase 02** and **03** are not strictly required for this phase, but Phase 05 will merge local tools + skills + plugins

---

## Suggested Files

| File | Purpose |
|------|---------|
| `config/mcp_plugins.json` | Plugin list and run commands (or other config file) |
| `src/plugins/loader.ts` | Start plugin processes and connect stdio |
| `src/plugins/client.ts` | MCP client per plugin (initialize + tools/list + tools/call) |
| `src/plugins/types.ts` | Plugin config type and loaded plugin descriptor |
| `src/config/load-plugins-config.ts` | Read and validate plugin config file |

---

## Notes

- Plugins run as independent MCP servers; the Hub aggregates them under one interface.
- Merging tool lists (local + skills + plugin tools) and routing requests is done fully in Phase 05.
