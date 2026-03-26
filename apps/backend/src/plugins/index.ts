/**
 * Plugin layer (Phase 04): load external MCP plugins via NPX, expose tools for Phase 05.
 */

export {
  loadAllPlugins,
  getLoadedPlugins,
  getAllPluginTools,
  callPluginTool,
  readPluginResource,
  closeAllPlugins,
} from "./loader.js";
export type { LoadedPlugin, PluginTool, PluginResourceRef, PluginConfig, McpPluginsConfig } from "./types.js";
export { PLUGIN_TOOL_PREFIX, PLUGIN_RESOURCE_URI_SCHEME } from "./constants.js";
