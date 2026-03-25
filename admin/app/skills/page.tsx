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
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import type { DynamicSkillEntry, DynamicToolEntry } from "@/lib/registry";
import type { RoleConfig } from "@/lib/roles";

async function fetchSkills() {
  const res = await fetch("/api/skills");
  if (!res.ok) throw new Error("Failed to fetch skills");
  return res.json() as Promise<DynamicSkillEntry[]>;
}

async function fetchTools() {
  const res = await fetch("/api/tools");
  if (!res.ok) throw new Error("Failed to fetch tools");
  return res.json() as Promise<DynamicToolEntry[]>;
}

type PluginStatusEntry = {
  id: string;
  status: string;
  tools?: Array<{ name: string; originalName?: string; description?: string }>;
  skills?: Array<{ name: string; originalName?: string; description?: string }>;
  allowedRoles?: string[];
};

async function fetchPluginStatus(): Promise<{ plugins: PluginStatusEntry[] }> {
  const res = await fetch("/api/plugin-status", { cache: "no-store" });
  if (!res.ok) return { plugins: [] };
  const data = await res.json();
  return { plugins: Array.isArray(data?.plugins) ? (data.plugins as PluginStatusEntry[]) : [] };
}

async function fetchRoles() {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json() as Promise<RoleConfig>;
}

function SkillsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DynamicSkillEntry | null>(null);
  const [form, setForm] = useState<Partial<DynamicSkillEntry>>({
    name: "",
    description: "",
    instructions: "",
    enabled: true,
    allowedRoles: [],
  });

  const { data: skills, isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkills,
  });
  const { data: tools } = useQuery({
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

  /** One row: registry (editable) or plugin (read-only). */
  type SkillRow =
    | (DynamicSkillEntry & { isPluginSkill?: false })
    | {
        name: string;
        description: string;
        instructions?: string;
        enabled: boolean;
        allowedRoles?: string[];
        source: "mcp";
        origin: string;
        isPluginSkill: true;
      };
  const skillRows: SkillRow[] = [
    ...(skills ?? []).map((s) => ({ ...s, isPluginSkill: false as const })),
    ...(pluginStatus?.plugins ?? [])
      .filter((p) => p.status === "connected" && Array.isArray(p.skills))
      .flatMap((p) =>
        (p.skills ?? []).map((sk) => ({
          name: sk.name,
          description: sk.description ?? "",
          instructions: undefined,
          enabled: true,
          allowedRoles: p.allowedRoles ?? [],
          source: "mcp" as const,
          origin: p.id,
          isPluginSkill: true as const,
        }))
      ),
  ];

  const createMutation = useMutation({
    mutationFn: async (body: DynamicSkillEntry) => {
      const res = await fetch("/api/skills", {
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
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Skill created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: { id: string; body: Partial<DynamicSkillEntry> }) => {
      const res = await fetch(`/api/skills/${encodeURIComponent(id)}`, {
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
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Skill updated");
      setDialogOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/skills/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Skill deleted");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  function resetForm() {
    setForm({
      name: "",
      description: "",
      instructions: "",
      enabled: true,
      allowedRoles: [],
    });
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(s: DynamicSkillEntry) {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description,
      instructions: s.instructions ?? "",
      enabled: s.enabled,
      allowedRoles: s.allowedRoles ?? [],
    });
    setDialogOpen(true);
  }

  function insertTemplate() {
    const tpl = [
      "## Purpose",
      "",
      "- What this skill achieves.",
      "",
      "## Inputs",
      "",
      "- List expected inputs and formats.",
      "",
      "## Steps (human)",
      "",
      "1. Step one",
      "2. Step two",
      "",
      "## Safety / Notes",
      "",
      "- Constraints, permissions, and caveats.",
      "",
    ].join("\n");
    setForm((s) => ({
      ...s,
      instructions: (s.instructions ?? "").trim() ? (s.instructions ?? "") : tpl,
    }));
    toast.add("success", "Inserted instructions template");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const instructions = String(form.instructions ?? "").trim();
    if (!instructions) {
      toast.add("error", "Instructions are required");
      return;
    }
    const payload = {
      ...form,
      instructions,
      allowedRoles: (form.allowedRoles?.length ?? 0) > 0 ? form.allowedRoles : undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.name, body: payload });
    } else {
      createMutation.mutate(payload as DynamicSkillEntry);
    }
  }

  useEffect(() => {
    if (searchParams.get("create") === "1") openCreate();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Skills</h2>
        <div className="flex items-center gap-2">
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Skill
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Written skills</CardTitle>
          <p className="text-sm text-muted-foreground">
            Skills are markdown-first, Cursor-like instructions.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !skillRows.length ? (
            <p className="text-muted-foreground">No skills yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium">Description</th>
                    <th className="p-3 text-left font-medium">Instructions</th>
                    <th className="p-3 text-left font-medium">Allowed Roles</th>
                    <th className="p-3 text-left font-medium">Source</th>
                    <th className="p-3 text-left font-medium">Origin</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {skillRows.map((s) => (
                    <tr key={s.name} className="border-b last:border-0">
                      <TableCellText text={s.name} label="Name" maxWidthClass="max-w-[160px]" innerClassName="font-mono" />
                      <TableCellText text={s.description} label="Description" maxWidthClass="max-w-[200px]" />
                      <TableCellText
                        text={
                          "isPluginSkill" in s && s.isPluginSkill
                            ? "—"
                            : (s as DynamicSkillEntry).instructions ?? ""
                        }
                        label="Instructions"
                        maxWidthClass="max-w-[220px]"
                      />
                      <td className="p-3">
                        {(s.allowedRoles?.length ?? 0) > 0
                          ? (s.allowedRoles ?? []).map((r) => (
                              <Badge key={r} variant="outline" className="mr-1 mb-1">
                                {roles.find((x) => x.id === r)?.name ?? r}
                              </Badge>
                            ))
                          : "—"}
                      </td>
                      <td className="p-3">
                        <Badge variant={s.source === "mcp" ? "secondary" : "outline"}>
                          {s.source === "mcp" ? "MCP" : "Admin"}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-xs">
                        {s.origin ?? "—"}
                      </td>
                      <td className="p-3">
                        <Badge variant={s.enabled ? "success" : "secondary"}>
                          {s.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {"isPluginSkill" in s && s.isPluginSkill ? (
                          <span className="text-muted-foreground text-xs">Read-only</span>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s as DynamicSkillEntry)} aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Delete this skill?"))
                                  deleteMutation.mutate(s.name);
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Skill" : "Create Skill"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="my_skill"
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
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="What this skill does"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="instructions">Full instructions (markdown)</Label>
            <Textarea
              id="instructions"
              value={form.instructions ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, instructions: e.target.value }))}
              placeholder="Full skill text / checklist / workflow."
              rows={12}
              className="mt-1 font-mono text-sm"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={insertTemplate}>
                Insert template
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Write this like a Cursor skill: clear purpose, inputs, and human steps.
            </p>
          </div>
          <AllowedRolesPicker
            roles={roles}
            value={form.allowedRoles ?? []}
            onChange={(v) => setForm((s) => ({ ...s, allowedRoles: v }))}
            entityLabel="This skill"
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

export default function SkillsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <SkillsContent />
    </Suspense>
  );
}
