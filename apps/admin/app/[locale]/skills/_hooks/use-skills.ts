"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/lib/toast";
import type { DynamicSkillEntry } from "@/lib/dynamic-registry-types";
import type { RoleConfig, RoleDefinition } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkillRow = {
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

async function fetchSkills(): Promise<SkillRow[]> {
  const res = await fetch("/api/skills", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch skills");
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

export function useSkills() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useTranslations("skills");

  const { data: skills, isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkills,
  });

  const { data: rolesConfig } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  const roles: RoleDefinition[] = rolesConfig?.roles ?? [];

  const saveAllMutation = useMutation({
    mutationFn: async (next: SkillRow[]) => {
      const res = await fetch("/api/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string })?.error ?? "Failed to save skills",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("saved"));
    },
    onError: (e) => toast.add("error", String(e)),
  });

  return {
    skills: skills ?? [],
    roles,
    isLoading,
    saveAllMutation,
  };
}
