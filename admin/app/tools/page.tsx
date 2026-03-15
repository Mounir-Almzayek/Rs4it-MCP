"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/lib/toast";
import { AllowedRolesPicker } from "@/components/roles/allowed-roles-picker";
import { TableCellText } from "@/components/table-cell-text";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { DynamicToolEntry } from "@/lib/registry";
import type { RoleConfig } from "@/lib/roles";

async function fetchTools() {
  const res = await fetch("/api/tools");
  if (!res.ok) throw new Error("Failed to fetch tools");
  return res.json() as Promise<DynamicToolEntry[]>;
}

async function fetchPluginStatus() {
  const res = await fetch("/api/plugin-status", { cache: "no-store" });
  if (!res.ok) return { plugins: [] as Array<{ id: string; name: string; status: string; tools?: Array<{ name: string; description?: string }> }> };
  const data = await res.json();
  return { plugins: Array.isArray(data?.plugins) ? data.plugins : [] };
}

async function fetchRoles() {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json() as Promise<RoleConfig>;
}

/** One row in the tools table: either registry (editable) or from MCP plugin (read-only). */
type ToolRow =
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

function ToolsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DynamicToolEntry | null>(null);
  const [form, setForm] = useState<Partial<DynamicToolEntry>>({
    name: "",
    description: "",
    inputSchema: {},
    handlerRef: "",
    enabled: true,
    allowedRoles: [],
  });
  const [schemaJson, setSchemaJson] = useState("{}");

  const { data: tools, isLoading } = useQuery({
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
  const roles = rolesConfig?.roles ?? [];

  const toolRows: ToolRow[] = [
    ...(tools ?? []).map((t) => ({ ...t, isPluginTool: false as const })),
    ...(pluginStatus?.plugins ?? [])
      .filter((p) => p.status === "connected" && Array.isArray(p.tools))
      .flatMap((p) =>
        (p.tools ?? []).map((t) => ({
          name: t.name,
          description: t.description ?? "",
          handlerRef: "—",
          allowedRoles: [] as string[],
          source: "mcp" as const,
          origin: p.id,
          enabled: true,
          isPluginTool: true as const,
        }))
      ),
  ];

  const createMutation = useMutation({
    mutationFn: async (body: DynamicToolEntry) => {
      const res = await fetch("/api/tools", {
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
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Tool created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: { id: string; body: Partial<DynamicToolEntry> }) => {
      const res = await fetch(`/api/tools/${encodeURIComponent(id)}`, {
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
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Tool updated");
      setDialogOpen(false);
      setEditing(null);
      resetForm();
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
      toast.add("success", "Tool deleted");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  function resetForm() {
    setForm({
      name: "",
      description: "",
      inputSchema: {},
      handlerRef: "",
      enabled: true,
      allowedRoles: [],
    });
    setSchemaJson("{}");
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(t: DynamicToolEntry) {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      handlerRef: t.handlerRef,
      enabled: t.enabled,
      allowedRoles: t.allowedRoles ?? [],
    });
    setSchemaJson(JSON.stringify(t.inputSchema ?? {}, null, 2));
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let inputSchema: Record<string, unknown> = {};
    try {
      inputSchema = JSON.parse(schemaJson);
    } catch {
      toast.add("error", "Invalid JSON for input schema");
      return;
    }
    const payload = {
      ...form,
      inputSchema,
      allowedRoles: (form.allowedRoles?.length ?? 0) > 0 ? form.allowedRoles : undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.name, body: payload });
    } else {
      createMutation.mutate(payload as DynamicToolEntry);
    }
  }

  useEffect(() => {
    if (searchParams.get("create") === "1") openCreate();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Tools</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Tool
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All tools</CardTitle>
          <p className="text-sm text-muted-foreground">
            Registry tools (editable) and tools from connected MCP plugins (read-only). Restart the Hub to refresh plugin tools.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : toolRows.length === 0 ? (
            <p className="text-muted-foreground">No tools yet. Create one from the registry or start the Hub with MCP plugins to see their tools here.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium">Description</th>
                    <th className="p-3 text-left font-medium">Handler</th>
                    <th className="p-3 text-left font-medium">Allowed Roles</th>
                    <th className="p-3 text-left font-medium">Source</th>
                    <th className="p-3 text-left font-medium">Origin</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Updated</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {toolRows.map((t) => (
                    <tr key={t.source === "mcp" ? `${t.origin}:${t.name}` : t.name} className="border-b last:border-0">
                      <TableCellText text={t.name} label="Name" maxWidthClass="max-w-[160px]" innerClassName="font-mono" />
                      <TableCellText text={t.description} label="Description" maxWidthClass="max-w-[200px]" />
                      <TableCellText text={t.handlerRef} label="Handler" maxWidthClass="max-w-[140px]" innerClassName="font-mono text-muted-foreground" />
                      <td className="p-3">
                        {(t.allowedRoles?.length ?? 0) > 0
                          ? (t.allowedRoles ?? []).map((r) => (
                              <Badge key={r} variant="outline" className="mr-1 mb-1">
                                {roles.find((x) => x.id === r)?.name ?? r}
                              </Badge>
                            ))
                          : "—"}
                      </td>
                      <td className="p-3">
                        <Badge variant={t.source === "mcp" ? "secondary" : "outline"}>
                          {t.source === "mcp" ? "MCP" : "Admin"}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-xs">
                        {t.origin ?? "—"}
                      </td>
                      <td className="p-3">
                        <Badge variant={t.enabled ? "success" : "secondary"}>
                          {t.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {t.updatedAt
                          ? new Date(t.updatedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="p-3 text-right">
                        {t.isPluginTool ? (
                          <span className="text-xs text-muted-foreground">Read-only</span>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(t)}
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Delete this tool?"))
                                  deleteMutation.mutate(t.name);
                              }}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Tool" : "Create Tool"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="my_tool"
              required
              disabled={!!editing}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
              placeholder="What this tool does"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="handlerRef">Handler reference (built-in tool name)</Label>
            <Input
              id="handlerRef"
              value={form.handlerRef}
              onChange={(e) =>
                setForm((s) => ({ ...s, handlerRef: e.target.value }))
              }
              placeholder="create_file"
              required
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="inputSchema">Input schema (JSON)</Label>
            <Textarea
              id="inputSchema"
              value={schemaJson}
              onChange={(e) => setSchemaJson(e.target.value)}
              placeholder='{"path": "string", "content": "string"}'
              rows={8}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <AllowedRolesPicker
            roles={roles}
            value={form.allowedRoles ?? []}
            onChange={(v) => setForm((s) => ({ ...s, allowedRoles: v }))}
            entityLabel="This tool"
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
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default function ToolsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <ToolsContent />
    </Suspense>
  );
}
