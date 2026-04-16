"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EntityTabs, type EntityTab } from "@/components/shared/entity-tabs";
import { MarketplaceTab } from "@/components/shared/marketplace-tab";
import { useToast } from "@/lib/toast";
import { SubagentsList } from "./_components/subagents-list";
import { SubagentDialog } from "./_components/subagent-dialog";
import { useSubagents } from "./_hooks/use-subagents";
import type { SubagentRow } from "./_hooks/use-subagents";

function SubagentsContent() {
  const t = useTranslations("subagents");
  const tc = useTranslations("common");
  const toast = useToast();

  const [tab, setTab] = useState<EntityTab>("list");

  const { subagents, roles, isLoading, saveAllMutation } = useSubagents();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubagentRow | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((subagent: SubagentRow) => {
    setEditing(subagent);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditing(null);
  }, []);

  const handleSubmit = useCallback(
    (form: Partial<SubagentRow>, isEdit: boolean) => {
      const name = String(form.name ?? "").trim();
      if (!name) {
        toast.add("error", t("nameRequired"));
        return;
      }

      const next: SubagentRow[] = subagents.slice();
      const idx = next.findIndex(
        (s) => s.name === (isEdit ? editing?.name ?? name : name),
      );
      const row: SubagentRow = {
        name,
        description: (String(form.description ?? "").trim() || null) as string | null,
        content: String(form.content ?? ""),
        model: (String(form.model ?? "").trim() || null) as string | null,
        readonly: Boolean(form.readonly),
        isBackground: Boolean(form.isBackground),
        enabled: Boolean(form.enabled ?? true),
        allowedRoles: Array.isArray(form.allowedRoles)
          ? form.allowedRoles
          : [],
      };
      if (idx === -1) next.push(row);
      else next[idx] = row;

      saveAllMutation.mutate(next, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditing(null);
        },
      });
    },
    [subagents, editing, saveAllMutation, toast, t],
  );

  const handleDeleteRequest = useCallback((name: string) => {
    setDeleteTarget(name);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    const next = subagents.filter((s) => s.name !== deleteTarget);
    saveAllMutation.mutate(next, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, subagents, saveAllMutation]);

  const installedNames = useMemo(() => new Set(subagents.map((s) => s.name)), [subagents]);

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={t("title")}
        createLabel={t("create")}
        onCreate={handleCreate}
      />

      <EntityTabs
        tab={tab}
        onTabChange={setTab}
        listLabel={t("title")}
        marketplaceLabel={tc("marketplace")}
      />

      {tab === "list" ? (
        <SubagentsList
          data={subagents}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      ) : (
        <MarketplaceTab
          type="subagent"
          installedNames={installedNames}
          queryKeysToInvalidate={[["subagents"], ["registry"]]}
        />
      )}

      <SubagentDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        editing={editing}
        roles={roles}
        onSubmit={handleSubmit}
        loading={saveAllMutation.isPending}
      />

      <ConfirmDelete
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        name={deleteTarget ?? ""}
        loading={saveAllMutation.isPending}
      />
    </div>
  );
}

export default function SubagentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-muted-foreground">Loading&hellip;</div>
      }
    >
      <SubagentsContent />
    </Suspense>
  );
}
