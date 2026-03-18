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

type PluginStatusEntry = {
  id: string;
  status: string;
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

type CompilerDraft = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  steps: DynamicSkillStep[];
};

type CompilerResponse = {
  draft: CompilerDraft;
  preview?: { summary?: string; steps?: string[] };
  risks?: string[];
  policy?: { blocked?: Array<{ reason: string; stepIndex?: number }>; warnings?: string[] };
  ok?: boolean;
  error?: string;
};

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
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiPreferredName, setAiPreferredName] = useState("");
  const [aiResult, setAiResult] = useState<CompilerResponse | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiDryRunBusy, setAiDryRunBusy] = useState(false);
  const [aiDryRun, setAiDryRun] = useState<{ ok: boolean; blocked?: any[]; warnings?: string[]; error?: string } | null>(null);
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
        steps: DynamicSkillStep[];
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
          steps: [],
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

  function openAi() {
    setAiText("");
    setAiPreferredName("");
    setAiResult(null);
    setAiDryRun(null);
    setAiOpen(true);
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

  async function runAiCompile() {
    if (!aiText.trim()) return;
    setAiBusy(true);
    setAiResult(null);
    setAiDryRun(null);
    try {
      const res = await fetch("/api/skill-compiler/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillText: aiText,
          preferredName: aiPreferredName.trim() || undefined,
          role: "admin",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as CompilerResponse;
      if (!res.ok) throw new Error(data.error ?? "Compile failed");
      setAiResult(data);
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy(false);
    }
  }

  async function runAiDryRun() {
    if (!aiResult?.draft) return;
    setAiDryRunBusy(true);
    setAiDryRun(null);
    try {
      const res = await fetch("/api/skill-compiler/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: aiResult.draft, role: "admin" }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      setAiDryRun(data);
      if (!res.ok) throw new Error(data.error ?? "Dry-run failed");
    } catch (e) {
      toast.add("error", e instanceof Error ? e.message : String(e));
    } finally {
      setAiDryRunBusy(false);
    }
  }

  function applyAiToForm() {
    if (!aiResult?.draft) return;
    const d = aiResult.draft;
    setEditing(null);
    setForm({
      name: d.name,
      description: d.description,
      inputSchema: d.inputSchema ?? {},
      steps: d.steps ?? [],
      enabled: true,
      allowedRoles: [],
    });
    setSchemaJson(JSON.stringify(d.inputSchema ?? {}, null, 2));
    setDialogOpen(true);
    setAiOpen(false);
    toast.add("success", "Applied AI draft to form");
  }

  useEffect(() => {
    if (searchParams.get("create") === "1") openCreate();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Skills</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openAi}>
            AI Generate
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Skill
          </Button>
        </div>
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
          ) : !skillRows.length ? (
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

      <Dialog open={aiOpen} onOpenChange={setAiOpen} title="AI Generate Skill">
        <div className="space-y-4">
          <div>
            <Label htmlFor="aiText">Skill description</Label>
            <Textarea
              id="aiText"
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              rows={6}
              className="mt-1"
              placeholder="Describe what you want the skill to do. Include inputs and constraints."
            />
          </div>
          <div>
            <Label htmlFor="aiPreferredName">Preferred name (optional)</Label>
            <Input
              id="aiPreferredName"
              value={aiPreferredName}
              onChange={(e) => setAiPreferredName(e.target.value)}
              placeholder="create_api_endpoint"
              className="mt-1 font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={runAiCompile} disabled={aiBusy || !aiText.trim()}>
              {aiBusy ? "Generating…" : "Generate"}
            </Button>
            <Button variant="outline" onClick={runAiDryRun} disabled={aiDryRunBusy || !aiResult?.draft}>
              {aiDryRunBusy ? "Checking…" : "Dry-run"}
            </Button>
            <Button variant="secondary" onClick={applyAiToForm} disabled={!aiResult?.draft}>
              Apply to form
            </Button>
          </div>

          {aiResult?.preview?.summary ? (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <p className="text-sm text-muted-foreground">{aiResult.preview.summary}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {(aiResult.preview.steps ?? []).length ? (
                  <ul className="list-disc pl-5 text-sm">
                    {(aiResult.preview.steps ?? []).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No preview steps.</p>
                )}
                {(aiResult.risks ?? []).length ? (
                  <div>
                    <div className="text-sm font-medium">Risks</div>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      {(aiResult.risks ?? []).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(aiResult.policy?.blocked?.length ?? 0) > 0 ? (
                  <div>
                    <div className="text-sm font-medium text-destructive">Blocked</div>
                    <ul className="list-disc pl-5 text-sm text-destructive">
                      {(aiResult.policy?.blocked ?? []).map((b, i) => (
                        <li key={i}>
                          {b.stepIndex !== undefined ? `Step ${b.stepIndex}: ` : ""}
                          {b.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(aiResult.policy?.warnings?.length ?? 0) > 0 ? (
                  <div>
                    <div className="text-sm font-medium">Warnings</div>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      {(aiResult.policy?.warnings ?? []).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiDryRun ? (
                  <div>
                    <div className="text-sm font-medium">Dry-run</div>
                    <div className="text-sm text-muted-foreground">
                      {aiDryRun.ok ? "OK" : "Blocked"}
                    </div>
                    {Array.isArray(aiDryRun.blocked) && aiDryRun.blocked.length ? (
                      <ul className="list-disc pl-5 text-sm text-destructive">
                        {aiDryRun.blocked.map((b: any, i: number) => (
                          <li key={i}>
                            {b.stepIndex !== undefined ? `Step ${b.stepIndex}: ` : ""}
                            {b.reason ?? String(b)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {Array.isArray(aiDryRun.warnings) && aiDryRun.warnings.length ? (
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {aiDryRun.warnings.map((w: string, i: number) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {aiResult?.draft ? (
            <Card>
              <CardHeader>
                <CardTitle>Draft</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {aiResult.draft.name} — {(aiResult.draft.steps ?? []).length} steps
                </p>
              </CardHeader>
              <CardContent>
                <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
                  {JSON.stringify(aiResult.draft, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </div>
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
