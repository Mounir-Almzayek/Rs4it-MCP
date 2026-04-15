"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/lib/toast";
import type { DynamicPluginEntry } from "@/lib/dynamic-registry-types";
import type { RoleConfig, RoleDefinition } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PluginConnectionStatus = {
  id: string;
  name: string;
  status: "connected" | "failed";
  toolsCount?: number;
  error?: string;
};

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchPlugins() {
  const res = await fetch("/api/plugins");
  if (!res.ok) throw new Error("Failed to fetch plugins");
  return res.json() as Promise<DynamicPluginEntry[]>;
}

async function fetchPluginStatus(): Promise<{
  updatedAt: string | null;
  plugins: PluginConnectionStatus[];
}> {
  const res = await fetch("/api/plugin-status", { cache: "no-store" });
  if (!res.ok) return { updatedAt: null, plugins: [] };
  const data = await res.json();
  return {
    updatedAt: data?.updatedAt ?? null,
    plugins: Array.isArray(data?.plugins)
      ? (data.plugins as PluginConnectionStatus[])
      : [],
  };
}

async function fetchRoles() {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json() as Promise<RoleConfig>;
}

// ---------------------------------------------------------------------------
// Reload helper
// ---------------------------------------------------------------------------

async function triggerReload() {
  try {
    await fetch("/api/reload", { method: "POST" });
  } catch {
    // Hub may be down or unreachable
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePlugins() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useTranslations("plugins");

  const { data: plugins, isLoading } = useQuery({
    queryKey: ["plugins"],
    queryFn: fetchPlugins,
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

  const connectionById = new Map(
    (pluginStatus?.plugins ?? []).map((p) => [
      p.id,
      { status: p.status, toolsCount: p.toolsCount, error: p.error },
    ]),
  );

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["plugins"] });
    queryClient.invalidateQueries({ queryKey: ["registry"] });
    queryClient.invalidateQueries({ queryKey: ["plugin-status"] });
    queryClient.invalidateQueries({ queryKey: ["tools"] });
  }

  const createMutation = useMutation({
    mutationFn: async (body: DynamicPluginEntry) => {
      const res = await fetch("/api/plugins", {
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
    onSuccess: async () => {
      await triggerReload();
      invalidateAll();
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
      body: Partial<DynamicPluginEntry>;
    }) => {
      const res = await fetch(`/api/plugins/${encodeURIComponent(id)}`, {
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
    onSuccess: async () => {
      await triggerReload();
      invalidateAll();
      toast.add("success", t("updated"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/plugins/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: async () => {
      await triggerReload();
      invalidateAll();
      toast.add("success", t("deleted"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  return {
    plugins: plugins ?? [],
    pluginStatus,
    connectionById,
    roles,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
