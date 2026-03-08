/**
 * Central place for MCP server identity and default capabilities.
 * Used by the server layer for initialize response and capabilities.
 */

export const SERVER_NAME = "rs4it-mcp-hub";
export const SERVER_VERSION = "0.1.0";

export const DEFAULT_CAPABILITIES = {
  tools: {
    listChanged: true,
  },
} as const;
