"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/lib/toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { DynamicToolEntry } from "@/lib/registry";

async function fetchTools() {
  const res = await fetch("/api/tools");
  if (!res.ok) throw new Error("Failed to fetch tools");
  return res.json() as Promise<DynamicToolEntry[]>;
}

export default function ToolsPage() {
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
  });
  const [schemaJson, setSchemaJson] = useState("{}");

  const { data: tools, isLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: fetchTools,
  });

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
    const payload = { ...form, inputSchema };
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
          <CardTitle>Dynamic tools</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tools defined in the registry and delegated to a built-in handler.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !tools?.length ? (
            <p className="text-muted-foreground">No tools yet. Create one to get started.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium">Description</th>
                    <th className="p-3 text-left font-medium">Handler</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Updated</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((t) => (
                    <tr key={t.name} className="border-b last:border-0">
                      <td className="p-3 font-mono">{t.name}</td>
                      <td className="max-w-[200px] truncate p-3">{t.description}</td>
                      <td className="p-3 font-mono text-muted-foreground">{t.handlerRef}</td>
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
