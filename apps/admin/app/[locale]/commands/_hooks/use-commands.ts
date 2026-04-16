"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/lib/toast";
import type { RoleConfig, RoleDefinition } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommandRow = {
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

async function fetchCommands(): Promise<CommandRow[]> {
  const res = await fetch("/api/commands", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch commands");
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

export const DEFAULT_COMMAND_CONTENT = `# Command

Describe the command workflow here.
- What it does
- Inputs expected
- Steps to run`;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCommands() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const t = useTranslations("commands");

  const { data: commands, isLoading } = useQuery({
    queryKey: ["commands"],
    queryFn: fetchCommands,
  });

  const { data: rolesConfig } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  const roles: RoleDefinition[] = rolesConfig?.roles ?? [];

  const saveAllMutation = useMutation({
    mutationFn: async (next: CommandRow[]) => {
      const res = await fetch("/api/commands", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string })?.error ?? "Failed to save commands",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commands"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("saved"));
    },
    onError: (e) => toast.add("error", String(e)),
  });

  return {
    commands: commands ?? [],
    roles,
    isLoading,
    saveAllMutation,
  };
}
