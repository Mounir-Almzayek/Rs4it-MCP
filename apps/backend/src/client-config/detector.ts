/**
 * Detect MCP client type from clientInfo.name.
 */

import type { ClientType } from "./types.js";

export function detectClient(clientInfoName: string | undefined): ClientType {
  if (!clientInfoName) return "unknown";
  const name = clientInfoName.toLowerCase();
  if (name.includes("cursor")) return "cursor";
  if (name.includes("claude")) return "claude";
  if (name.includes("copilot") || name.includes("vscode")) return "copilot";
  return "unknown";
}
