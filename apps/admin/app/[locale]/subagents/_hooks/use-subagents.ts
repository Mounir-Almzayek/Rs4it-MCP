"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/lib/toast";
import type { RoleConfig, RoleDefinition } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubagentRow = {
  name: string;
  description?: string | null;
  content: string;
  model?: string | null;
  readonly?: boolean;
  isBackground?: boolean;
  enabled: boolean;
  allowedRoles?: string[] | null;
  updatedAt?: string;
};

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchSubagents(): Promise<SubagentRow[]> {
  const res = await fetch("/api/subagents", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch subagents");
  return res.json();
}

async function fetchRoles(): Promise<RoleConfig> {
  const res = await fetch("/api/roles", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json();
}

// ---------------------------------------------------------------------------
// Default content
// ---------------------------------------------------------------------------

export const DEFAULT_SUBAGENT_CONTENT = `You are a specialized subagent.

When invoked:
1. Analyze the task scope.
2. Execute the required steps.
3. Return a concise final report with actionable findings.`;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSubagents() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useTranslations("subagents");

  const { data: subagents, isLoading } = useQuery({
    queryKey: ["subagents"],
    queryFn: fetchSubagents,
  });

  const { data: rolesConfig } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  const roles: RoleDefinition[] = rolesConfig?.roles ?? [];

  const saveAllMutation = useMutation({
    mutationFn: async (next: SubagentRow[]) => {
      const res = await fetch("/api/subagents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subagents: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string })?.error ?? "Failed to save subagents",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subagents"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("saved"));
    },
    onError: (e) => toast.add("error", String(e)),
  });

  return {
    subagents: subagents ?? [],
    roles,
    isLoading,
    saveAllMutation,
  };
}
