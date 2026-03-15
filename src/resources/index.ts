/**
 * Built-in resources (Phase 13).
 * Registers Hub resources on the McpServer so clients see them in resources/list.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  REGISTRY_RESOURCE_URI,
  REGISTRY_RESOURCE_NAME,
  readRegistryResource,
} from "./registry-resource.js";

export function registerBuiltInResources(server: McpServer): void {
  server.registerResource(
    REGISTRY_RESOURCE_NAME,
    REGISTRY_RESOURCE_URI,
    {
      title: "Hub registry",
      description: "JSON summary of available tools (built-in + dynamic), skills, and loaded plugins.",
    },
    async (uri) => readRegistryResource(uri)
  );
}
