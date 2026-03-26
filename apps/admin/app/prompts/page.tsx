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

type PromptRow = {
  name: string;
  description?: string | null;
  content: string;
  enabled: boolean;
  allowedRoles?: string[] | null;
  updatedAt?: string;
};

async function fetchPrompts(): Promise<PromptRow[]> {
  const res = await fetch("/api/prompts", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch prompts");
  return res.json();
}

async function fetchRoles(): Promise<RoleConfig> {
  const res = await fetch("/api/roles", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json();
}

export default function PromptsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: prompts, isLoading } = useQuery({ queryKey: ["prompts"], queryFn: fetchPrompts });
  const { data: rolesConfig } = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  const roles = rolesConfig?.roles ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PromptRow>>({
    name: "",
    description: "",
    content: "",
    enabled: true,
    allowedRoles: [],
  });

  const sorted = useMemo(() => (prompts ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)), [prompts]);

  const saveAll = useMutation({
    mutationFn: async (next: PromptRow[]) => {
      const res = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to save prompts");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Prompts saved");
    },
    onError: (e) => toast.add("error", String(e)),
  });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", content: "", enabled: true, allowedRoles: [] });
    setDialogOpen(true);
  }

  function openEdit(p: PromptRow) {
    setEditing(p.name);
    setForm({
      name: p.name,
      description: p.description ?? "",
      content: p.content ?? "",
      enabled: p.enabled !== false,
      allowedRoles: (p.allowedRoles ?? []) as any,
    });
    setDialogOpen(true);
  }

  function applySave() {
    const name = String(form.name ?? "").trim();
    if (!name) {
      toast.add("error", "Name is required");
      return;
    }
    const next: PromptRow[] = (prompts ?? []).slice();
    const idx = next.findIndex((p) => p.name === (editing ?? name));
    const row: PromptRow = {
      name,
      description: (String(form.description ?? "").trim() || null) as any,
      content: String(form.content ?? ""),
      enabled: Boolean(form.enabled ?? true),
      allowedRoles: (Array.isArray(form.allowedRoles) ? form.allowedRoles : []) as any,
    };
    if (idx === -1) next.push(row);
    else next[idx] = row;
    void saveAll.mutateAsync(next);
    setDialogOpen(false);
  }

  function applyDelete(name: string) {
    const next = (prompts ?? []).filter((p) => p.name !== name);
    void saveAll.mutateAsync(next as any);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Prompts</h2>
        <Button onClick={openCreate}>New Prompt</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DB-backed prompts (MCP)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Prompts are exposed to MCP clients via prompts/list + prompts/get when supported by the SDK.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : sorted.length === 0 ? (
            <p className="text-muted-foreground">No prompts yet.</p>
          ) : (
            <ul className="space-y-2">
              {sorted.map((p) => (
                <li key={p.name} className="rounded border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      {p.description ? <div className="text-sm text-muted-foreground">{p.description}</div> : null}
                      <div className="mt-2 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{p.content}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => openEdit(p)}>Edit</Button>
                      <Button variant="destructive" onClick={() => applyDelete(p.name)}>Delete</Button>
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
          <div className="text-lg font-semibold">{editing ? "Edit prompt" : "Create prompt"}</div>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={String(form.name ?? "")} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Input value={String(form.description ?? "")} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Content</Label>
            <Textarea rows={10} value={String(form.content ?? "")} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
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

