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
import type { DynamicPromptEntry } from "@/lib/registry";
import type { RoleConfig } from "@/lib/roles";

async function fetchPrompts() {
  const res = await fetch("/api/prompts");
  if (!res.ok) throw new Error("Failed to fetch prompts");
  return res.json() as Promise<DynamicPromptEntry[]>;
}

async function fetchRoles() {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json() as Promise<RoleConfig>;
}

function PromptsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DynamicPromptEntry | null>(null);
  const [form, setForm] = useState<Partial<DynamicPromptEntry>>({
    name: "",
    title: "",
    description: "",
    argsSchema: undefined,
    template: "",
    enabled: true,
    allowedRoles: [],
  });
  const [argsSchemaJson, setArgsSchemaJson] = useState("");

  const { data: prompts, isLoading } = useQuery({
    queryKey: ["prompts"],
    queryFn: fetchPrompts,
  });
  const { data: rolesConfig } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });
  const roles = rolesConfig?.roles ?? [];

  const createMutation = useMutation({
    mutationFn: async (body: DynamicPromptEntry) => {
      const res = await fetch("/api/prompts", {
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
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Prompt created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: { id: string; body: Partial<DynamicPromptEntry> }) => {
      const res = await fetch(`/api/prompts/${encodeURIComponent(id)}`, {
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
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Prompt updated");
      setDialogOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/prompts/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Prompt deleted");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  function resetForm() {
    setForm({
      name: "",
      title: "",
      description: "",
      argsSchema: undefined,
      template: "",
      enabled: true,
      allowedRoles: [],
    });
    setArgsSchemaJson("");
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(p: DynamicPromptEntry) {
    setEditing(p);
    setForm({
      name: p.name,
      title: p.title,
      description: p.description,
      argsSchema: p.argsSchema,
      template: p.template,
      enabled: p.enabled,
      allowedRoles: p.allowedRoles ?? [],
    });
    setArgsSchemaJson(
      p.argsSchema ? JSON.stringify(p.argsSchema, null, 2) : ""
    );
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let argsSchema: Record<string, unknown> | undefined;
    if (argsSchemaJson.trim()) {
      try {
        argsSchema = JSON.parse(argsSchemaJson);
      } catch {
        toast.add("error", "Invalid JSON for args schema");
        return;
      }
    }
    const payload = {
      ...form,
      argsSchema,
      allowedRoles: (form.allowedRoles?.length ?? 0) > 0 ? form.allowedRoles : undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.name, body: payload });
    } else {
      createMutation.mutate(payload as DynamicPromptEntry);
    }
  }

  useEffect(() => {
    if (searchParams.get("create") === "1") openCreate();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Prompts</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Prompt
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dynamic prompts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Prompts defined in the registry. Use {"{{argName}}"} in the template for substitution.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !prompts?.length ? (
            <p className="text-muted-foreground">No prompts yet. Create one to get started.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium">Title</th>
                    <th className="p-3 text-left font-medium">Description</th>
                    <th className="p-3 text-left font-medium">Allowed Roles</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Updated</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prompts.map((p) => (
                    <tr key={p.name} className="border-b last:border-0">
                      <TableCellText text={p.name} label="Name" maxWidthClass="max-w-[160px]" innerClassName="font-mono" />
                      <TableCellText text={p.title ?? ""} label="Title" maxWidthClass="max-w-[180px]" innerClassName="text-muted-foreground" />
                      <TableCellText text={p.description} label="Description" maxWidthClass="max-w-[200px]" />
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
                      <td className="p-3 text-muted-foreground">
                        {p.updatedAt
                          ? new Date(p.updatedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(p)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this prompt?"))
                              deleteMutation.mutate(p.name);
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Prompt" : "Create Prompt"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="my_prompt"
              required
              disabled={!!editing}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={form.title ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value || undefined }))}
              placeholder="Display title"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={form.description ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="What this prompt does"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="argsSchema">Args schema (JSON, optional)</Label>
            <Textarea
              id="argsSchema"
              value={argsSchemaJson}
              onChange={(e) => setArgsSchemaJson(e.target.value)}
              placeholder='{"topic": {"type": "string", "description": "Topic"}}'
              rows={6}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="template">Template</Label>
            <Textarea
              id="template"
              value={form.template ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, template: e.target.value }))}
              placeholder="You are a helpful assistant. Topic: {{topic}}"
              rows={8}
              required
              className="mt-1 font-mono text-sm"
            />
          </div>
          <AllowedRolesPicker
            roles={roles}
            value={form.allowedRoles ?? []}
            onChange={(v) => setForm((s) => ({ ...s, allowedRoles: v }))}
            entityLabel="This prompt"
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

export default function PromptsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <PromptsContent />
    </Suspense>
  );
}
