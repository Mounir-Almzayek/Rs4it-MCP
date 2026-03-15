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
import type { DynamicSkillEntry, DynamicSkillStep } from "@/lib/registry";
import type { RoleConfig } from "@/lib/roles";

async function fetchSkills() {
  const res = await fetch("/api/skills");
  if (!res.ok) throw new Error("Failed to fetch skills");
  return res.json() as Promise<DynamicSkillEntry[]>;
}

async function fetchRoles() {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json() as Promise<RoleConfig>;
}

function StepRow({
  step,
  onRemove,
}: {
  step: DynamicSkillStep;
  index: number;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded border bg-muted/30 p-2">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <Badge variant="outline">{step.type}</Badge>
      <span className="flex-1 font-mono text-sm">{step.target}</span>
      <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove step">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
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
    inputSchema: {},
    steps: [],
    enabled: true,
    allowedRoles: [],
  });
  const [schemaJson, setSchemaJson] = useState("{}");
  const [newStepType, setNewStepType] = useState<"tool" | "plugin">("tool");
  const [newStepTarget, setNewStepTarget] = useState("");

  const { data: skills, isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkills,
  });
  const { data: rolesConfig } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });
  const roles = rolesConfig?.roles ?? [];

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
      inputSchema: {},
      steps: [],
      enabled: true,
      allowedRoles: [],
    });
    setSchemaJson("{}");
    setNewStepTarget("");
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
      inputSchema: s.inputSchema,
      steps: s.steps ?? [],
      enabled: s.enabled,
      allowedRoles: s.allowedRoles ?? [],
    });
    setSchemaJson(JSON.stringify(s.inputSchema ?? {}, null, 2));
    setDialogOpen(true);
  }

  function addStep() {
    if (!newStepTarget.trim()) return;
    setForm((s) => ({
      ...s,
      steps: [...(s.steps ?? []), { type: newStepType, target: newStepTarget.trim() }],
    }));
    setNewStepTarget("");
  }

  function removeStep(i: number) {
    setForm((s) => ({
      ...s,
      steps: (s.steps ?? []).filter((_, idx) => idx !== i),
    }));
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
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Skill
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orchestration workflows</CardTitle>
          <p className="text-sm text-muted-foreground">
            Skills run a sequence of tool or plugin steps.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !skills?.length ? (
            <p className="text-muted-foreground">No skills yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium">Description</th>
                    <th className="p-3 text-left font-medium">Steps</th>
                    <th className="p-3 text-left font-medium">Allowed Roles</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((s) => (
                    <tr key={s.name} className="border-b last:border-0">
                      <TableCellText text={s.name} label="Name" maxWidthClass="max-w-[160px]" innerClassName="font-mono" />
                      <TableCellText text={s.description} label="Description" maxWidthClass="max-w-[200px]" />
                      <td className="p-3">{(s.steps ?? []).length} steps</td>
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
                        <Badge variant={s.enabled ? "success" : "secondary"}>
                          {s.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label="Edit">
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
            <Label>Steps</Label>
            <div className="mt-1 space-y-2">
              {(form.steps ?? []).map((step, i) => (
                <StepRow
                  key={i}
                  step={step}
                  index={i}
                  onRemove={() => removeStep(i)}
                />
              ))}
              <div className="flex gap-2">
                <select
                  value={newStepType}
                  onChange={(e) => setNewStepType(e.target.value as "tool" | "plugin")}
                  className="rounded border bg-background px-3 py-2 text-sm"
                >
                  <option value="tool">tool</option>
                  <option value="plugin">plugin</option>
                </select>
                <Input
                  value={newStepTarget}
                  onChange={(e) => setNewStepTarget(e.target.value)}
                  placeholder={newStepType === "tool" ? "create_file" : "plugin:id:tool_name"}
                  className="flex-1 font-mono"
                />
                <Button type="button" variant="outline" onClick={addStep}>
                  Add step
                </Button>
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="inputSchema">Input schema (JSON)</Label>
            <Textarea
              id="inputSchema"
              value={schemaJson}
              onChange={(e) => setSchemaJson(e.target.value)}
              rows={4}
              className="mt-1 font-mono text-sm"
            />
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
