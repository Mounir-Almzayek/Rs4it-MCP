"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/lib/toast";
import { AllowedRolesPicker } from "@/components/roles/allowed-roles-picker";
import { TableCellText } from "@/components/table-cell-text";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { DynamicPluginEntry } from "@/lib/registry";
import type { RoleConfig } from "@/lib/roles";

async function fetchPlugins() {
  const res = await fetch("/api/plugins");
  if (!res.ok) throw new Error("Failed to fetch plugins");
  return res.json() as Promise<DynamicPluginEntry[]>;
}

async function fetchRoles() {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json() as Promise<RoleConfig>;
}

function resolvedCommand(p: DynamicPluginEntry): string {
  return [p.command, ...(p.args ?? [])].join(" ");
}

function PluginsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DynamicPluginEntry | null>(null);
  const [form, setForm] = useState<Partial<DynamicPluginEntry>>({
    id: "",
    name: "",
    command: "npx",
    args: ["-y", "package@latest"],
    description: "",
    enabled: true,
    allowedRoles: [],
  });
  const [argsStr, setArgsStr] = useState('["-y", "package@latest"]');

  const { data: plugins, isLoading } = useQuery({
    queryKey: ["plugins"],
    queryFn: fetchPlugins,
  });
  const { data: rolesConfig } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });
  const roles = rolesConfig?.roles ?? [];

  const createMutation = useMutation({
    mutationFn: async (body: DynamicPluginEntry) => {
      const res = await fetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? res.statusText);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Plugin added");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: { id: string; body: Partial<DynamicPluginEntry> }) => {
      const res = await fetch(`/api/plugins/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? res.statusText);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Plugin updated");
      setDialogOpen(false);
      setEditing(null);
      resetForm();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Plugin deleted");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  function resetForm() {
    setForm({
      id: "",
      name: "",
      command: "npx",
      args: ["-y", "package@latest"],
      description: "",
      enabled: true,
      allowedRoles: [],
    });
    setArgsStr('["-y", "package@latest"]');
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(p: DynamicPluginEntry) {
    setEditing(p);
    setForm({
      id: p.id,
      name: p.name,
      command: p.command,
      args: p.args,
      description: p.description,
      enabled: p.enabled,
      allowedRoles: p.allowedRoles ?? [],
    });
    setArgsStr(JSON.stringify(p.args ?? [], null, 2));
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let args: string[] = [];
    try {
      args = JSON.parse(argsStr);
      if (!Array.isArray(args)) args = [];
    } catch {
      toast.add("error", "Args must be a JSON array of strings");
      return;
    }
    const payload = {
      ...form,
      args,
      allowedRoles: (form.allowedRoles?.length ?? 0) > 0 ? form.allowedRoles : undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: payload });
    } else {
      createMutation.mutate(payload as DynamicPluginEntry);
    }
  }

  useEffect(() => {
    if (searchParams.get("create") === "1") openCreate();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">MCP Plugins</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Plugin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>External MCP plugins</CardTitle>
          <p className="text-sm text-muted-foreground">
            Plugins are run via command + args (e.g. npx -y package@latest).
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !plugins?.length ? (
            <p className="text-muted-foreground">No plugins yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">ID</th>
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium">Resolved command</th>
                    <th className="p-3 text-left font-medium">Allowed Roles</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plugins.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3 font-mono">{p.id}</td>
                      <td className="p-3">{p.name}</td>
                      <TableCellText
                        text={resolvedCommand(p)}
                        label="Resolved command"
                        maxWidthClass="max-w-[300px]"
                        className="font-mono text-muted-foreground"
                      />
                      <td className="p-3">
                        {(p.allowedRoles?.length ?? 0) > 0
                          ? (p.allowedRoles ?? []).map((r) => (
                              <Badge key={r} variant="outline" className="mr-1 mb-1">
                                {roles.find((x) => x.id === r)?.name ?? r}
                              </Badge>
                            ))
                          : "—"}
                      </td>
                      <td className="p-3">
                        <Badge variant={p.enabled ? "success" : "secondary"}>
                          {p.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this plugin?"))
                              deleteMutation.mutate(p.id);
                          }}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Plugin" : "Add Plugin"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="id">ID</Label>
            <Input
              id="id"
              value={form.id}
              onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))}
              placeholder="my-plugin"
              required
              disabled={!!editing}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Human-readable name"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="command">Command</Label>
            <Input
              id="command"
              value={form.command}
              onChange={(e) => setForm((s) => ({ ...s, command: e.target.value }))}
              placeholder="npx"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="args">Args (JSON array)</Label>
            <Input
              id="args"
              value={argsStr}
              onChange={(e) => setArgsStr(e.target.value)}
              placeholder='["-y", "package@latest"]'
              className="mt-1 font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Resolved: {form.command} {(() => {
                try {
                  const a = JSON.parse(argsStr);
                  return Array.isArray(a) ? a.join(" ") : argsStr;
                } catch {
                  return argsStr;
                }
              })()}
            </p>
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={form.description ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value || undefined }))}
              className="mt-1"
            />
          </div>
          <AllowedRolesPicker
            roles={roles}
            value={form.allowedRoles ?? []}
            onChange={(v) => setForm((s) => ({ ...s, allowedRoles: v }))}
            entityLabel="This plugin"
          />
          <div className="flex items-center gap-2">
            <Switch
              checked={form.enabled ?? true}
              onCheckedChange={(c) => setForm((s) => ({ ...s, enabled: c }))}
            />
            <Label>Enabled</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default function PluginsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <PluginsContent />
    </Suspense>
  );
}
