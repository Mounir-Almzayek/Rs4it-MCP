"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import { Check, X, Search, Filter } from "lucide-react";
import type { RoleConfig } from "@/lib/roles";
import type { DynamicRegistry } from "@/lib/registry";

type CapabilityType = "tool" | "skill" | "plugin";

interface MatrixRow {
  id: string;
  type: CapabilityType;
  name: string;
  allowedRoles: string[];
}

async function fetchRegistry() {
  const res = await fetch("/api/registry");
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
  const queryClient = useQueryClient();
  const toast = useToast();
  const [typeFilter, setTypeFilter] = useState<CapabilityType | "all">("all");
  const [search, setSearch] = useState("");

  const { data: registry, isLoading: registryLoading } = useQuery({
    queryKey: ["registry"],
    queryFn: fetchRegistry,
  });
  const { data: rolesConfig, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });
  const roles = rolesConfig?.roles ?? [];

  const rows = useMemo((): MatrixRow[] => {
    if (!registry) return [];
    const r: MatrixRow[] = [];
    registry.tools.forEach((t) => {
      r.push({
        id: `tool:${t.name}`,
        type: "tool",
        name: t.name,
        allowedRoles: t.allowedRoles ?? [],
      });
    });
    registry.skills.forEach((s) => {
      r.push({
        id: `skill:${s.name}`,
        type: "skill",
        name: s.name,
        allowedRoles: s.allowedRoles ?? [],
      });
    });
    registry.plugins.forEach((p) => {
      r.push({
        id: `plugin:${p.id}`,
        type: "plugin",
        name: p.name || p.id,
        allowedRoles: p.allowedRoles ?? [],
      });
    });
    return r;
  }, [registry]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (typeFilter !== "all") {
      list = list.filter((r) => r.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
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
      toast.add("success", "Tool permissions updated");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateSkillRoles = useMutation({
    mutationFn: async ({
      name,
      allowedRoles,
    }: { name: string; allowedRoles: string[] | undefined }) => {
      const res = await fetch(`/api/skills/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedRoles }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Skill permissions updated");
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
      toast.add("success", "Plugin permissions updated");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  function togglePermission(row: MatrixRow, roleId: string) {
    const currentlyAllowed = isAllowed(row.allowedRoles, roleId);

    if (currentlyAllowed) {
      const base = row.allowedRoles.length === 0 ? roles.map((r) => r.id) : [...row.allowedRoles];
      const next = base.filter((id) => id !== roleId);
      const payload = next.length === 0 ? undefined : next;
      if (row.type === "tool")
        updateToolRoles.mutate({ name: row.name, allowedRoles: payload });
      else if (row.type === "skill")
        updateSkillRoles.mutate({ name: row.name, allowedRoles: payload });
      else updatePluginRoles.mutate({ id: row.id.replace("plugin:", ""), allowedRoles: payload });
    } else {
      const base = row.allowedRoles.length === 0 ? [] : [...row.allowedRoles];
      const next = base.includes(roleId) ? base : [...base, roleId];
      if (row.type === "tool")
        updateToolRoles.mutate({ name: row.name, allowedRoles: next });
      else if (row.type === "skill")
        updateSkillRoles.mutate({ name: row.name, allowedRoles: next });
      else updatePluginRoles.mutate({ id: row.id.replace("plugin:", ""), allowedRoles: next });
    }
  }

  const isLoading = registryLoading || rolesLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Permissions Matrix</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access control</CardTitle>
          <p className="text-sm text-muted-foreground">
            Rows: capabilities (tools, skills, plugins). Columns: roles. ✓ = allowed, ✗ = not allowed. Empty allowed list = visible to all. Toggle a cell to update.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search capability…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-[220px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="type-filter" className="text-sm text-muted-foreground">
                Type
              </Label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as CapabilityType | "all")}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="tool">Tools</option>
                <option value="skill">Skills</option>
                <option value="plugin">Plugins</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : roles.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <p>No roles defined. Add roles first from the Roles page.</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <p>No capabilities match the filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium sticky left-0 bg-muted/50 z-10 min-w-[200px]">
                      Capability
                    </th>
                    <th className="p-2 text-left font-medium w-8">Type</th>
                    {roles.map((r) => (
                      <th
                        key={r.id}
                        className="p-2 text-center font-medium min-w-[80px]"
                        title={r.name ?? r.id}
                      >
                        <span className="truncate block max-w-[80px]">
                          {r.name ?? r.id}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-2 font-mono text-xs sticky left-0 bg-background z-10">
                        {row.name}
                      </td>
                      <td className="p-2">
                        <Badge
                          variant={
                            row.type === "tool"
                              ? "default"
                              : row.type === "skill"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {row.type}
                        </Badge>
                      </td>
                      {roles.map((role) => {
                        const allowed = isAllowed(row.allowedRoles, role.id);
                        return (
                          <td key={role.id} className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => togglePermission(row, role.id)}
                              className={allowed ? "text-emerald-600" : "text-muted-foreground hover:text-foreground"}
                              title={allowed ? "Revoke" : "Allow"}
                              aria-label={allowed ? `Revoke ${role.id}` : `Allow ${role.id}`}
                            >
                              {allowed ? (
                                <Check className="h-5 w-5 mx-auto" />
                              ) : (
                                <X className="h-5 w-5 mx-auto" />
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
