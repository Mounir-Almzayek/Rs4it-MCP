/**
 * Plugin layer (Phase 04): load external MCP plugins via NPX, expose tools for Phase 05.
 */

export {
  loadAllPlugins,
  getLoadedPlugins,
  getAllPluginTools,
  callPluginTool,
  closeAllPlugins,
} from "./loader.js";
export type { LoadedPlugin, PluginTool, PluginConfig, McpPluginsConfig } from "./types.js";
export { PLUGIN_TOOL_PREFIX } from "./constants.js";
