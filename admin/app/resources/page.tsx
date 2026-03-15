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
import type { DynamicResourceEntry } from "@/lib/registry";
import type { RoleConfig } from "@/lib/roles";

async function fetchResources() {
  const res = await fetch("/api/resources");
  if (!res.ok) throw new Error("Failed to fetch resources");
  return res.json() as Promise<DynamicResourceEntry[]>;
}

async function fetchRoles() {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json() as Promise<RoleConfig>;
}

function ResourcesContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DynamicResourceEntry | null>(null);
  const [form, setForm] = useState<Partial<DynamicResourceEntry>>({
    name: "",
    uri: "",
    description: "",
    mimeType: "text/plain",
    content: "",
    enabled: true,
    allowedRoles: [],
  });

  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: fetchResources,
  });
  const { data: rolesConfig } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });
  const roles = rolesConfig?.roles ?? [];

  const createMutation = useMutation({
    mutationFn: async (body: DynamicResourceEntry) => {
      const res = await fetch("/api/resources", {
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
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Resource created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: { id: string; body: Partial<DynamicResourceEntry> }) => {
      const res = await fetch(`/api/resources/${encodeURIComponent(id)}`, {
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
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Resource updated");
      setDialogOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/resources/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      toast.add("success", "Resource deleted");
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  function resetForm() {
    setForm({
      name: "",
      uri: "",
      description: "",
      mimeType: "text/plain",
      content: "",
      enabled: true,
      allowedRoles: [],
    });
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(r: DynamicResourceEntry) {
    setEditing(r);
    setForm({
      name: r.name,
      uri: r.uri,
      description: r.description,
      mimeType: r.mimeType,
      content: r.content,
      enabled: r.enabled,
      allowedRoles: r.allowedRoles ?? [],
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      allowedRoles: (form.allowedRoles?.length ?? 0) > 0 ? form.allowedRoles : undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.name, body: payload });
    } else {
      createMutation.mutate(payload as DynamicResourceEntry);
    }
  }

  useEffect(() => {
    if (searchParams.get("create") === "1") openCreate();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Resources</h2>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Resource
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dynamic resources</CardTitle>
          <p className="text-sm text-muted-foreground">
            Static resources (e.g. rs4it://docs/…) with inline content, visible in resources/list.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !resources?.length ? (
            <p className="text-muted-foreground">No resources yet. Create one to get started.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium">URI</th>
                    <th className="p-3 text-left font-medium">Description</th>
                    <th className="p-3 text-left font-medium">MIME</th>
                    <th className="p-3 text-left font-medium">Allowed Roles</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Updated</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((r) => (
                    <tr key={r.name} className="border-b last:border-0">
                      <td className="p-3 font-mono">{r.name}</td>
                      <td className="p-3 font-mono text-muted-foreground max-w-[180px] truncate" title={r.uri}>
                        {r.uri}
                      </td>
                      <TableCellText text={r.description ?? ""} label="Description" maxWidthClass="max-w-[160px]" />
                      <td className="p-3 text-muted-foreground">{r.mimeType}</td>
                      <td className="p-3">
                        {(r.allowedRoles?.length ?? 0) > 0
                          ? (r.allowedRoles ?? []).map((roleId) => (
                              <Badge key={roleId} variant="outline" className="mr-1 mb-1">
                                {roles.find((x) => x.id === roleId)?.name ?? roleId}
                              </Badge>
                            ))
                          : "—"}
                      </td>
                      <td className="p-3">
                        <Badge variant={r.enabled ? "success" : "secondary"}>
                          {r.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {r.updatedAt
                          ? new Date(r.updatedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(r)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this resource?"))
                              deleteMutation.mutate(r.name);
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Resource" : "Create Resource"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="readme"
              required
              disabled={!!editing}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="uri">URI</Label>
            <Input
              id="uri"
              value={form.uri ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, uri: e.target.value }))}
              placeholder="rs4it://docs/readme"
              required
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={form.description ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value || undefined }))}
              placeholder="Short description"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="mimeType">MIME type</Label>
            <Input
              id="mimeType"
              value={form.mimeType ?? "text/plain"}
              onChange={(e) => setForm((s) => ({ ...s, mimeType: e.target.value }))}
              placeholder="text/plain"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={form.content ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
              placeholder="Static text or JSON content…"
              rows={10}
              required
              className="mt-1 font-mono text-sm"
            />
          </div>
          <AllowedRolesPicker
            roles={roles}
            value={form.allowedRoles ?? []}
            onChange={(v) => setForm((s) => ({ ...s, allowedRoles: v }))}
            entityLabel="This resource"
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

export default function ResourcesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <ResourcesContent />
    </Suspense>
  );
}
