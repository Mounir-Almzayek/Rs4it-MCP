/**
 * Types and pure helpers for usage (Phase 12).
 * Safe to import from client components — no Node.js APIs.
 */

export interface UsageEvent {
  toolName: string;
  userName?: string;
  timestamp: string;
}

export interface EntityStats {
  total: number;
  byUser: Record<string, number>;
}

export interface UsageStats {
  byEntity: Record<string, EntityStats>;
  recent: UsageEvent[];
}

export function entityType(toolName: string): "tool" | "skill" | "plugin" {
  if (toolName.startsWith("skill:")) return "skill";
  if (toolName.startsWith("plugin:")) return "plugin";
  return "tool";
}
