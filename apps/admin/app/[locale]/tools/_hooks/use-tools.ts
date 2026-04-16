"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/lib/toast";
import type { DynamicToolEntry } from "@/lib/dynamic-registry-types";
import type { RoleConfig, RoleDefinition } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PluginStatusEntry = {
  id: string;
  name: string;
  status: string;
  tools?: Array<{ name: string; description?: string }>;
  allowedRoles?: string[];
};

/** One row in the tools table: either registry (editable) or from MCP plugin (read-only). */
export type ToolRow =
  | (DynamicToolEntry & { isPluginTool?: false })
  | {
      name: string;
      description: string;
      handlerRef: string;
      allowedRoles?: string[];
      source: "mcp";
      origin: string;
      enabled: boolean;
      updatedAt?: string;
      isPluginTool: true;
    };

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchTools() {
  const res = await fetch("/api/tools");
  if (!res.ok) throw new Error("Failed to fetch tools");
  return res.json() as Promise<DynamicToolEntry[]>;
}

async function fetchPluginStatus(): Promise<{ plugins: PluginStatusEntry[] }> {
  const res = await fetch("/api/plugin-status", { cache: "no-store" });
  if (!res.ok) return { plugins: [] };
  const data = await res.json();
  return {
    plugins: Array.isArray(data?.plugins)
      ? (data.plugins as PluginStatusEntry[])
      : [],
  };
}

async function fetchRoles() {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json() as Promise<RoleConfig>;
}

// ---------------------------------------------------------------------------
// Dedupe helper
// ---------------------------------------------------------------------------

function dedupeByOriginAndName<T extends { name: string; origin: string }>(
  rows: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = `${row.origin}:${row.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTools() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useTranslations("tools");

  // Queries
  const {
    data: tools,
    isLoading,
  } = useQuery({
    queryKey: ["tools"],
    queryFn: fetchTools,
  });

  const { data: pluginStatus } = useQuery({
    queryKey: ["plugin-status"],
    queryFn: fetchPluginStatus,
  });

  const { data: rolesConfig } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  const roles: RoleDefinition[] = rolesConfig?.roles ?? [];

  // Combined rows (admin + plugin)
  const toolRows: ToolRow[] = [
    ...(tools ?? []).map((item) => ({ ...item, isPluginTool: false as const })),
    ...dedupeByOriginAndName(
      (pluginStatus?.plugins ?? [])
        .filter(
          (p: PluginStatusEntry) =>
            p.status === "connected" && Array.isArray(p.tools),
        )
        .flatMap((p: PluginStatusEntry) =>
          (p.tools ?? []).map(
            (tool: { name: string; description?: string }) => ({
              name: tool.name,
              description: tool.description ?? "",
              handlerRef: "\u2014",
              allowedRoles: p.allowedRoles ?? [],
              source: "mcp" as const,
              origin: p.id,
              enabled: true,
              isPluginTool: true as const,
            }),
          ),
        ),
    ),
  ];

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (body: DynamicToolEntry) => {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? res.statusText,
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("created"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Partial<DynamicToolEntry>;
    }) => {
      const res = await fetch(`/api/tools/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? res.statusText,
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("updated"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tools/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("deleted"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  return {
    toolRows,
    roles,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
