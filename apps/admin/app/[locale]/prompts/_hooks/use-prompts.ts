"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/lib/toast";
import type { RoleConfig, RoleDefinition } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PromptRow = {
  name: string;
  description?: string | null;
  content: string;
  enabled: boolean;
  allowedRoles?: string[] | null;
  updatedAt?: string;
};

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchPrompts(): Promise<PromptRow[]> {
  const res = await fetch("/api/prompts", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch prompts");
  return res.json();
}

async function fetchRoles(): Promise<RoleConfig> {
  const res = await fetch("/api/roles", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePrompts() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useTranslations("prompts");

  const { data: prompts, isLoading } = useQuery({
    queryKey: ["prompts"],
    queryFn: fetchPrompts,
  });

  const { data: rolesConfig } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  const roles: RoleDefinition[] = rolesConfig?.roles ?? [];

  const saveAllMutation = useMutation({
    mutationFn: async (next: PromptRow[]) => {
      const res = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string })?.error ?? "Failed to save prompts",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("saved"));
    },
    onError: (e) => toast.add("error", String(e)),
  });

  return {
    prompts: prompts ?? [],
    roles,
    isLoading,
    saveAllMutation,
  };
}
