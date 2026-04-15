"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/lib/toast";
import type { DynamicResourceEntry } from "@/lib/dynamic-registry-types";
import type { RoleConfig, RoleDefinition } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PluginStatusEntry = {
  id: string;
  status: string;
  resources?: Array<{
    name: string;
    originalName?: string;
    uri: string;
    description?: string;
    mimeType?: string;
  }>;
  allowedRoles?: string[];
};

export type ResourceRow =
  | (DynamicResourceEntry & { isPluginResource?: false })
  | {
      name: string;
      uri: string;
      description?: string;
      mimeType: string;
      content: string;
      enabled: boolean;
      allowedRoles?: string[];
      updatedAt?: string;
      source: "mcp";
      origin: string;
      isPluginResource: true;
    };

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchResources() {
  const res = await fetch("/api/resources");
  if (!res.ok) throw new Error("Failed to fetch resources");
  return res.json() as Promise<DynamicResourceEntry[]>;
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

export function useResources() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useTranslations("resources");

  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: fetchResources,
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

  const resourceRows: ResourceRow[] = [
    ...(resources ?? []).map((r) => ({
      ...r,
      isPluginResource: false as const,
    })),
    ...dedupeByOriginAndName(
      (pluginStatus?.plugins ?? [])
        .filter((p) => p.status === "connected" && Array.isArray(p.resources))
        .flatMap((p) =>
          (p.resources ?? []).map((res) => ({
            name: res.name,
            uri: res.uri,
            description: res.description ?? "",
            mimeType: res.mimeType ?? "text/plain",
            content: "",
            enabled: true,
            allowedRoles: p.allowedRoles ?? [],
            source: "mcp" as const,
            origin: p.id,
            isPluginResource: true as const,
          })),
        ),
    ),
  ];

  const createMutation = useMutation({
    mutationFn: async (body: DynamicResourceEntry) => {
      const res = await fetch("/api/resources", {
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
      queryClient.invalidateQueries({ queryKey: ["resources"] });
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
      body: Partial<DynamicResourceEntry>;
    }) => {
      const res = await fetch(`/api/resources/${encodeURIComponent(id)}`, {
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
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("updated"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/resources/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("deleted"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  return {
    resourceRows,
    roles,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
