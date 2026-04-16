/**
 * Fetches client config files from the Hub API and writes them locally.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface ConfigFile {
  path: string;
  content: string;
}

export interface SyncOptions {
  hubUrl: string;
  clientType: string;
  token?: string;
  role?: string;
  workspaceRoot: string;
}

/**
 * Fetch config files from the Hub and write them to the workspace.
 */
export async function syncClientConfig(options: SyncOptions): Promise<number> {
  const { hubUrl, clientType, token, role, workspaceRoot } = options;

  // Build the API URL — strip /mcp suffix if present and use /api/client-config
  const baseUrl = hubUrl.replace(/\/mcp\/?$/, "");
  const params = new URLSearchParams({ clientType });
  if (role) params.set("role", role);
  const apiUrl = `${baseUrl}/api/client-config?${params}`;

  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (token) {
    headers["x-admin-secret"] = token;
  }

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Hub API returned ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { ok: boolean; files?: ConfigFile[]; error?: string };
  if (!data.ok || !data.files) {
    throw new Error(`Hub API error: ${data.error ?? "No files returned"}`);
  }

  // Write each file to the workspace
  let written = 0;
  for (const file of data.files) {
    const fullPath = path.join(workspaceRoot, file.path);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, "utf-8");
    written++;
  }

  return written;
}
