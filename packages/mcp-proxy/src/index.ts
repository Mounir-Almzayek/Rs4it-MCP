#!/usr/bin/env node
/**
 * RS4IT MCP Proxy — CLI entry point.
 *
 * Usage:
 *   rs4it-mcp-proxy <hub-url>
 *   rs4it-mcp-proxy http://localhost:3000/mcp
 *
 * Environment variables:
 *   MCP_HUB_URL       — Hub URL (alternative to positional arg)
 *   MCP_AUTH_TOKEN     — Auth token for Hub API
 *   MCP_CLIENT_TYPE    — Client type: cursor | claude | copilot (default: cursor)
 *   MCP_ROLE           — User role for config filtering
 *   MCP_WORKSPACE_ROOT — Workspace root override (default: process.cwd())
 */

import { startProxy } from "./proxy.js";

const hubUrl = process.argv[2] || process.env["MCP_HUB_URL"];

if (!hubUrl) {
  process.stderr.write(
    "Usage: rs4it-mcp-proxy <hub-url>\n" +
    "  or set MCP_HUB_URL environment variable\n\n" +
    "Example:\n" +
    '  rs4it-mcp-proxy http://localhost:3000/mcp\n\n' +
    "Environment variables:\n" +
    "  MCP_HUB_URL        Hub URL\n" +
    "  MCP_AUTH_TOKEN      Auth token for Hub API\n" +
    "  MCP_CLIENT_TYPE     cursor | claude | copilot (default: cursor)\n" +
    "  MCP_ROLE            User role for filtering\n" +
    "  MCP_WORKSPACE_ROOT  Workspace root (default: cwd)\n"
  );
  process.exit(1);
}

startProxy({
  hubUrl,
  token: process.env["MCP_AUTH_TOKEN"],
  clientType: process.env["MCP_CLIENT_TYPE"] ?? "cursor",
  role: process.env["MCP_ROLE"],
  workspaceRoot: process.env["MCP_WORKSPACE_ROOT"] ?? process.cwd(),
});
