"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/lib/toast";
import { Plus, Pencil, Trash2, GitBranch } from "lucide-react";
import type { RoleConfig, RoleDefinition } from "@/lib/roles";
import { RoleInheritanceGraph } from "@/components/roles/role-inheritance-graph";

async function fetchRolesConfig() {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json() as Promise<RoleConfig>;
}

export default function RolesPage() {
  const t = useTranslations("roles");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleDefinition | null>(null);
  const [editing, setEditing] = useState<RoleDefinition | null>(null);
  const [form, setForm] = useState<Partial<RoleDefinition>>({
    id: "",
    name: "",
    inherits: [],
  });
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRolesConfig,
  });
  const roles = config?.roles ?? [];
  const defaultRole = config?.defaultRole;

  const createMutation = useMutation({
    mutationFn: async (body: RoleDefinition) => {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? res.statusText);
      }
      return res.json() as Promise<RoleDefinition>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.add("success", t("roleCreated"));
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<RoleDefinition> }) => {
      const res = await fetch(`/api/roles/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? res.statusText);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.add("success", t("roleUpdated"));
      setDialogOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/roles/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.add("success", t("roleDeleted"));
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const res = await fetch("/api/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultRole: roleId }),
      });
      if (!res.ok) throw new Error("Failed to set default role");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.add("success", t("defaultUpdated"));
    },
    onError: (e: Error) => toast.add("error", e.message),
  });

  function resetForm() {
    setForm({ id: "", name: "", inherits: [] });
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(r: RoleDefinition) {
    setEditing(r);
    setForm({
      id: r.id,
      name: r.name ?? r.id,
      inherits: r.inherits ?? [],
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = (form.id ?? "").trim();
    const name = (form.name ?? id).trim();
    const inherits = form.inherits ?? [];
    if (!id) {
      toast.add("error", t("idRequired"));
      return;
    }
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        body: { name, inherits },
      });
    } else {
      createMutation.mutate({ id, name, inherits });
    }
  }

  function addInherit(roleId: string) {
    const current = form.inherits ?? [];
    if (current.includes(roleId) || roleId === form.id) return;
    setForm((s) => ({ ...s, inherits: [...current, roleId] }));
  }

  function removeInherit(roleId: string) {
    setForm((s) => ({
      ...s,
      inherits: (s.inherits ?? []).filter((x) => x !== roleId),
    }));
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight">{t("title")}</h2>
        <Button onClick={openCreate}>
          <Plus className="me-2 h-4 w-4" />
          {t("create")}
        </Button>
      </div>

      <Card className="border-border/80 bg-card/50">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>{t("definitionsTitle")}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{t("definitionsDesc")}</p>
            </div>
            {roles.length > 0 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="default-role" className="text-sm text-muted-foreground">
                  {t("defaultRole")}
                </Label>
                <select
                  id="default-role"
                  value={defaultRole ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) setDefaultMutation.mutate(v);
                  }}
                  disabled={setDefaultMutation.isPending}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name ?? r.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{tc("loading")}</p>
          ) : !roles.length ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <GitBranch className="mx-auto h-10 w-10 opacity-50" />
              <p className="mt-2">{t("noRolesYet")}</p>
              <Button className="mt-4" onClick={openCreate}>
                {t("create")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">{t("id")}</th>
                    <th className="p-3 text-start font-medium">{tc("name")}</th>
                    <th className="p-3 text-start font-medium">{t("inheritsFrom")}</th>
                    <th className="p-3 text-start font-medium">{t("defaultRole")}</th>
                    <th className="p-3 text-end font-medium">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-b last:border-0 ${selectedRoleId === r.id ? "bg-primary/5" : ""}`}
                    >
                      <td className="p-3 font-mono">{r.id}</td>
                      <td className="p-3">{r.name ?? r.id}</td>
                      <td className="p-3">
                        {(r.inherits?.length ?? 0) > 0 ? (
                          (r.inherits ?? []).map((pid) => (
                            <Badge key={pid} variant="outline" className="mr-1 mb-1">
                              {roles.find((x) => x.id === pid)?.name ?? pid}
                            </Badge>
                          ))
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        {defaultRole === r.id ? (
                          <Badge variant="secondary">{t("defaultBadge")}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedRoleId((s) => (s === r.id ? null : r.id));
                          }}
                          aria-label={t("highlightGraph")}
                          title={t("highlightGraph")}
                        >
                          <GitBranch className="h-4 w-4" />
                        </Button>
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
                          onClick={() => setDeleteTarget(r)}
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

      {roles.length > 0 && (
        <Card className="border-border/80 bg-card/50">
          <CardHeader>
            <CardTitle>{t("graphTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("graphDesc")}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] rounded-md border bg-muted/20">
              <RoleInheritanceGraph
                roles={roles}
                selectedRoleId={selectedRoleId}
                onSelectRole={setSelectedRoleId}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? t("edit") : t("create")}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="role-id">{t("id")}</Label>
            <Input
              id="role-id"
              value={form.id}
              onChange={(e) => setForm((s) => ({ ...s, id: e.target.value.trim().toLowerCase().replace(/\s+/g, "_") }))}
              placeholder={t("idPlaceholder")}
              required
              disabled={!!editing}
              className="mt-1 font-mono"
            />
            {editing && <p className="mt-1 text-xs text-muted-foreground">{t("idLocked")}</p>}
          </div>
          <div>
            <Label htmlFor="role-name">{t("displayName")}</Label>
            <Input
              id="role-name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder={t("namePlaceholder")}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t("inheritsFrom")}</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("inheritHelp")}</p>
            <div className="mt-2 flex flex-wrap gap-2 rounded-md border bg-muted/30 p-2 min-h-[44px]">
              {(form.inherits ?? []).map((id) => (
                <Badge key={id} variant="secondary" className="gap-1 pr-1 font-normal">
                  {roles.find((r) => r.id === id)?.name ?? id}
                  <button
                    type="button"
                    onClick={() => removeInherit(id)}
                    className="rounded-full p-0.5 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label={`Remove ${id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <select
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v && v !== form.id) addInherit(v);
                e.target.value = "";
              }}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={t("addParent")}
            >
              <option value="">{t("addParent")}</option>
              {roles
                .filter((r) => r.id !== form.id && !(form.inherits ?? []).includes(r.id))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name ?? r.id}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? tc("save") : t("create")}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={tc("delete")}
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("deleteWarn", { name: deleteTarget.name ?? deleteTarget.id })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                {tc("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
              >
                {tc("delete")}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
