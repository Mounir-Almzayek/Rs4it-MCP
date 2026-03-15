/**
 * Write capabilities snapshot to file (Phase 14).
 * Same config directory as dynamic-registry; dashboard reads this to show live tools and source.
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { getDynamicRegistryPath } from "./dynamic-config.js";
import type { CapabilitiesSnapshot } from "../types/capabilities-snapshot.js";

export function getCapabilitiesSnapshotPath(): string {
  const registryPath = getDynamicRegistryPath();
  const dir = path.dirname(registryPath);
  return path.join(dir, "mcp_capabilities_snapshot.json");
}

export async function writeCapabilitiesSnapshot(snapshot: CapabilitiesSnapshot): Promise<void> {
  const filePath = getCapabilitiesSnapshotPath();
  await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
}
