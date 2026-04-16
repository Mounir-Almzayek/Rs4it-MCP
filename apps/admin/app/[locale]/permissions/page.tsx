"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import { TableCellText } from "@/components/table-cell-text";
import { Check, X, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleConfig } from "@/lib/roles";
import type { DynamicRegistry } from "@/lib/dynamic-registry-types";

type CapabilityType =
  | "tool"
  | "skill"
  | "plugin"
  | "prompt"
  | "resource"
  | "rule"
  | "subagent"
  | "command";

const FILTER_TYPES: CapabilityType[] = [
  "tool",
  "skill",
  "plugin",
  "prompt",
  "resource",
  "rule",
  "subagent",
  "command",
];

const NAV_KEY: Record<
  CapabilityType,
  "tools" | "skills" | "plugins" | "prompts" | "resources" | "rules" | "subagents" | "commands"
> = {
  tool: "tools",
  skill: "skills",
  plugin: "plugins",
  prompt: "prompts",
  resource: "resources",
  rule: "rules",
  subagent: "subagents",
  command: "commands",
};

interface MatrixRow {
  id: string;
  type: CapabilityType;
  name: string;
  allowedRoles: string[];
}

async function fetchRegistry() {
  const res = await fetch("/api/registry", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch registry");
  return res.json() as Promise<DynamicRegistry>;
}

async function fetchRoles() {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json() as Promise<RoleConfig>;
}

function isAllowed(allowedRoles: string[] | undefined, roleId: string): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(roleId);
}

export default function PermissionsMatrixPage() {
  const t = useTranslations("permissions");
  const tNav = useTranslations("nav");
  const queryClient = useQueryClient();
  const toast = useToast();
  const [typeFilter, setTypeFilter] = useState<CapabilityType | "all">("all");
  const [search, setSearch] = useState("");

  const { data: registry, isLoading: registryLoading } = useQuery({
    queryKey: ["registry"],
    queryFn: fetchRegistry,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const { data: rolesConfig, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });
  const roles = rolesConfig?.roles ?? [];

  const rows = useMemo((): MatrixRow[] => {
    if (!registry) return [];
    const r: MatrixRow[] = [];
    const tools = Array.isArray(registry.tools) ? registry.tools : [];
    const skills = Array.isArray(registry.skills) ? registry.skills : [];
    const plugins = Array.isArray(registry.plugins) ? registry.plugins : [];
    const prompts = Array.isArray(registry.prompts) ? registry.prompts : [];
    const resources = Array.isArray(registry.resources) ? registry.resources : [];
    const rules = Array.isArray(registry.rules) ? registry.rules : [];
    const subagents = Array.isArray(registry.subagents) ? registry.subagents : [];
    const commands = Array.isArray(registry.commands) ? registry.commands : [];

    tools.forEach((item) => {
      r.push({
        id: `tool:${item.name}`,
        type: "tool",
        name: item.name,
        allowedRoles: item.allowedRoles ?? [],
      });
    });
    skills.forEach((item) => {
      r.push({
        id: `skill:${item.name}`,
        type: "skill",
        name: item.name,
        allowedRoles: item.allowedRoles ?? [],
      });
    });
    plugins.forEach((item) => {
      r.push({
        id: `plugin:${item.id}`,
        type: "plugin",
        name: item.name || item.id,
        allowedRoles: item.allowedRoles ?? [],
      });
    });
    prompts.forEach((item) => {
      r.push({
        id: `prompt:${item.name}`,
        type: "prompt",
        name: item.name,
        allowedRoles: item.allowedRoles ?? [],
      });
    });
    resources.forEach((item) => {
      r.push({
        id: `resource:${item.name}`,
        type: "resource",
        name: item.name,
        allowedRoles: item.allowedRoles ?? [],
      });
    });
    rules.forEach((item) => {
      r.push({
        id: `rule:${item.name}`,
        type: "rule",
        name: item.name,
        allowedRoles: item.allowedRoles ?? [],
      });
    });
    subagents.forEach((item) => {
      r.push({
        id: `subagent:${item.name}`,
        type: "subagent",
        name: item.name,
        allowedRoles: item.allowedRoles ?? [],
      });
    });
    commands.forEach((item) => {
      r.push({
        id: `command:${item.name}`,
        type: "command",
        name: item.name,
        allowedRoles: item.allowedRoles ?? [],
      });
    });
    return r;
  }, [registry]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (typeFilter !== "all") {
      list = list.filter((row) => row.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (row) => row.name.toLowerCase().includes(q) || row.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, typeFilter, search]);

  const updateToolRoles = useMutation({
    mutationFn: async ({
      name,
      allowedRoles,
    }: { name: string; allowedRoles: string[] | undefined }) => {
      const res = await fetch(`/api/tools/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedRoles }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("toastTool"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updatePluginRoles = useMutation({
    mutationFn: async ({
      id,
      allowedRoles,
    }: { id: string; allowedRoles: string[] | undefined }) => {
      const res = await fetch(`/api/plugins/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedRoles }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("toastPlugin"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateResourceRoles = useMutation({
    mutationFn: async ({
      name,
      allowedRoles,
    }: { name: string; allowedRoles: string[] | undefined }) => {
      const res = await fetch(`/api/resources/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedRoles }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("toastResource"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateSkillRoles = useMutation({
    mutationFn: async ({ name, allowedRoles }: { name: string; allowedRoles: string[] | undefined }) => {
      const current = Array.isArray(registry?.skills) ? registry.skills : [];
      const next = current.map((s) => (s.name === name ? { ...s, allowedRoles } : s));
      const res = await fetch(`/api/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: next }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("toastSkill"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updatePromptRoles = useMutation({
    mutationFn: async ({ name, allowedRoles }: { name: string; allowedRoles: string[] | undefined }) => {
      const current = Array.isArray(registry?.prompts) ? registry.prompts : [];
      const next = current.map((p) => (p.name === name ? { ...p, allowedRoles } : p));
      const res = await fetch(`/api/prompts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts: next }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("toastPrompt"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateRuleRoles = useMutation({
    mutationFn: async ({ name, allowedRoles }: { name: string; allowedRoles: string[] | undefined }) => {
      const res = await fetch(`/api/rules/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedRoles }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("toastRule"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateSubagentRoles = useMutation({
    mutationFn: async ({ name, allowedRoles }: { name: string; allowedRoles: string[] | undefined }) => {
      const current = Array.isArray(registry?.subagents) ? registry.subagents : [];
      const next = current.map((s) => (s.name === name ? { ...s, allowedRoles } : s));
      const res = await fetch(`/api/subagents`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subagents: next }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("toastSubagent"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateCommandRoles = useMutation({
    mutationFn: async ({ name, allowedRoles }: { name: string; allowedRoles: string[] | undefined }) => {
      const current = Array.isArray(registry?.commands) ? registry.commands : [];
      const next = current.map((c) => (c.name === name ? { ...c, allowedRoles } : c));
      const res = await fetch(`/api/commands`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands: next }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", t("toastCommand"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  function applyRoles(row: MatrixRow, allowedRoles: string[] | undefined) {
    switch (row.type) {
      case "tool":
        updateToolRoles.mutate({ name: row.name, allowedRoles });
        break;
      case "skill":
        updateSkillRoles.mutate({ name: row.name, allowedRoles });
        break;
      case "plugin":
        updatePluginRoles.mutate({ id: row.id.replace("plugin:", ""), allowedRoles });
        break;
      case "prompt":
        updatePromptRoles.mutate({ name: row.name, allowedRoles });
        break;
      case "resource":
        updateResourceRoles.mutate({ name: row.name, allowedRoles });
        break;
      case "rule":
        updateRuleRoles.mutate({ name: row.name, allowedRoles });
        break;
      case "subagent":
        updateSubagentRoles.mutate({ name: row.name, allowedRoles });
        break;
      case "command":
        updateCommandRoles.mutate({ name: row.name, allowedRoles });
        break;
      default:
        break;
    }
  }

  function togglePermission(row: MatrixRow, roleId: string) {
    const currentlyAllowed = isAllowed(row.allowedRoles, roleId);

    if (currentlyAllowed) {
      const base = row.allowedRoles.length === 0 ? roles.map((r) => r.id) : [...row.allowedRoles];
      const next = base.filter((id) => id !== roleId);
      const payload = next.length === 0 ? undefined : next;
      applyRoles(row, payload);
    } else {
      const base = row.allowedRoles.length === 0 ? [] : [...row.allowedRoles];
      const next = base.includes(roleId) ? base : [...base, roleId];
      applyRoles(row, next);
    }
  }

  const isLoading = registryLoading || rolesLoading;

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">{t("title")}</h2>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">{t("accessTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("intro")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder={t("searchCap")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-[220px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Label htmlFor="type-filter" className="text-sm text-muted-foreground">
                {t("filterType")}
              </Label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as CapabilityType | "all")}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">{t("all")}</option>
                {FILTER_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {tNav(NAV_KEY[ft])}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">{t("loading")}</p>
          ) : roles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-secondary/20 p-8 text-center text-muted-foreground">
              <p>{t("noRoles")}</p>
              <p className="mt-2 text-xs">{t("addRolesHint")}</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 p-8 text-center text-muted-foreground">
              <p>{t("noMatch")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/80">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="sticky start-0 z-10 min-w-[200px] bg-secondary/50 p-2 text-start font-medium">
                      {t("capability")}
                    </th>
                    <th className="w-28 p-2 text-start font-medium">{t("type")}</th>
                    {roles.map((r) => (
                      <th
                        key={r.id}
                        className="min-w-[80px] p-2 text-center font-medium"
                        title={r.name ?? r.id}
                      >
                        <span className="block max-w-[80px] truncate">{r.name ?? r.id}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="group animate-card-reveal border-b border-border/80 last:border-0 hover:bg-secondary/30"
                    >
                      <TableCellText
                        text={row.name}
                        label={t("capability")}
                        maxWidthClass="max-w-[200px]"
                        className="sticky start-0 z-10 bg-background p-2 font-mono text-xs group-hover:bg-secondary/30"
                        innerClassName="font-mono text-xs"
                      />
                      <td className="p-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium",
                            row.type === "tool" && "border-primary/40 text-primary",
                          )}
                        >
                          {tNav(NAV_KEY[row.type])}
                        </Badge>
                      </td>
                      {roles.map((role) => {
                        const allowed = isAllowed(row.allowedRoles, role.id);
                        return (
                          <td key={role.id} className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => togglePermission(row, role.id)}
                              className={cn(
                                allowed ? "text-success" : "text-muted-foreground hover:text-foreground",
                              )}
                              title={allowed ? t("revoke") : t("allow")}
                              aria-label={
                                allowed ? `${t("revoke")} ${role.id}` : `${t("allow")} ${role.id}`
                              }
                            >
                              {allowed ? (
                                <Check className="mx-auto h-5 w-5" />
                              ) : (
                                <X className="mx-auto h-5 w-5" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
