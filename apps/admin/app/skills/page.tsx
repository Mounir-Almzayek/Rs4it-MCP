"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { AllowedRolesPicker } from "@/components/roles/allowed-roles-picker";
import { useToast } from "@/lib/toast";
import type { RoleConfig } from "@/lib/roles";

type SkillRow = {
  name: string;
  description?: string | null;
  content: string;
  enabled: boolean;
  allowedRoles?: string[] | null;
  updatedAt?: string;
};

async function fetchSkills(): Promise<SkillRow[]> {
  const res = await fetch("/api/skills", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch skills");
  return res.json();
}

async function fetchRoles(): Promise<RoleConfig> {
  const res = await fetch("/api/roles", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json();
}

const DEFAULT_MD = `# Skill

This skill runs a workflow of tool calls.

\`\`\`json
{
  "inputSchema": { "type": "object", "properties": {} },
  "steps": [
    { "tool": "create_file", "args": { "path": "$input.path", "content": "$input.content" } }
  ]
}
\`\`\`
`;

export default function SkillsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: skills, isLoading } = useQuery({ queryKey: ["skills"], queryFn: fetchSkills });
  const { data: rolesConfig } = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  const roles = rolesConfig?.roles ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [contentMd, setContentMd] = useState(DEFAULT_MD);
  const [form, setForm] = useState<Partial<SkillRow>>({
    name: "",
    description: "",
    enabled: true,
    allowedRoles: [],
  });

  const sorted = useMemo(() => (skills ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)), [skills]);

  const saveAll = useMutation({
    mutationFn: async (next: SkillRow[]) => {
      const res = await fetch("/api/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to save skills");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Skills saved");
    },
    onError: (e) => toast.add("error", String(e)),
  });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", enabled: true, allowedRoles: [] });
    setContentMd(DEFAULT_MD);
    setDialogOpen(true);
  }

  function openEdit(s: SkillRow) {
    setEditing(s.name);
    setForm({
      name: s.name,
      description: s.description ?? "",
      enabled: s.enabled !== false,
      allowedRoles: (s.allowedRoles ?? []) as any,
    });
    setContentMd(String((s as any).content ?? ""));
    setDialogOpen(true);
  }

  function applySave() {
    const name = String(form.name ?? "").trim();
    if (!name) {
      toast.add("error", "Name is required");
      return;
    }
    const content = String(contentMd ?? "");

    const next: SkillRow[] = (skills ?? []).slice();
    const idx = next.findIndex((s) => s.name === (editing ?? name));
    const row: SkillRow = {
      name,
      description: (String(form.description ?? "").trim() || null) as any,
      content,
      enabled: Boolean(form.enabled ?? true),
      allowedRoles: (Array.isArray(form.allowedRoles) ? form.allowedRoles : []) as any,
    };
    if (idx === -1) next.push(row);
    else next[idx] = row;
    void saveAll.mutateAsync(next);
    setDialogOpen(false);
  }

  function applyDelete(name: string) {
    const next = (skills ?? []).filter((s) => s.name !== name);
    void saveAll.mutateAsync(next as any);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Skills</h2>
        <Button onClick={openCreate}>New Skill</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DB-backed skills (exposed as tools)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each skill is exposed to MCP clients as a tool named <span className="font-mono">skill:&lt;name&gt;</span>.
            Steps run tools by name. You can reference input fields via strings like <span className="font-mono">$input.path</span>.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : sorted.length === 0 ? (
            <p className="text-muted-foreground">No skills yet.</p>
          ) : (
            <ul className="space-y-2">
              {sorted.map((s) => (
                <li key={s.name} className="rounded border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      {s.description ? <div className="text-sm text-muted-foreground">{s.description}</div> : null}
                      <div className="mt-2 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                        {s.content}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => openEdit(s)}>Edit</Button>
                      <Button variant="destructive" onClick={() => applyDelete(s.name)}>Delete</Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="text-lg font-semibold">{editing ? "Edit skill" : "Create skill"}</div>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={String(form.name ?? "")} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Input value={String(form.description ?? "")} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Content (Markdown)</Label>
            <Textarea rows={14} value={contentMd} onChange={(e) => setContentMd(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="font-medium">Enabled</div>
              <div className="text-sm text-muted-foreground">Disable to hide from MCP clients.</div>
            </div>
            <Switch checked={Boolean(form.enabled ?? true)} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
          </div>
          <div className="grid gap-2">
            <Label>Allowed roles</Label>
            <AllowedRolesPicker
              roles={roles}
              value={Array.isArray(form.allowedRoles) ? (form.allowedRoles as any) : []}
              onChange={(v) => setForm((f) => ({ ...f, allowedRoles: v }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={applySave} disabled={saveAll.isPending}>Save</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

