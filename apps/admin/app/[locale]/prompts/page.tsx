"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EntityTabs, type EntityTab } from "@/components/shared/entity-tabs";
import { MarketplaceTab } from "@/components/shared/marketplace-tab";
import { useToast } from "@/lib/toast";
import { PromptsList } from "./_components/prompts-list";
import { PromptDialog } from "./_components/prompt-dialog";
import { usePrompts } from "./_hooks/use-prompts";
import type { PromptRow } from "./_hooks/use-prompts";

function PromptsContent() {
  const t = useTranslations("prompts");
  const tc = useTranslations("common");
  const toast = useToast();

  const [tab, setTab] = useState<EntityTab>("list");

  const { prompts, roles, isLoading, saveAllMutation } = usePrompts();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromptRow | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((prompt: PromptRow) => {
    setEditing(prompt);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditing(null);
  }, []);

  const handleSubmit = useCallback(
    (form: Partial<PromptRow>, isEdit: boolean) => {
      const name = String(form.name ?? "").trim();
      if (!name) {
        toast.add("error", t("nameRequired"));
        return;
      }

      const next: PromptRow[] = prompts.slice();
      const idx = next.findIndex(
        (p) => p.name === (isEdit ? editing?.name ?? name : name),
      );
      const row: PromptRow = {
        name,
        description: (String(form.description ?? "").trim() || null) as string | null,
        content: String(form.content ?? ""),
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
    [prompts, editing, saveAllMutation, toast, t],
  );

  const handleDeleteRequest = useCallback((name: string) => {
    setDeleteTarget(name);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    const next = prompts.filter((p) => p.name !== deleteTarget);
    saveAllMutation.mutate(next, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, prompts, saveAllMutation]);

  const installedNames = useMemo(() => new Set(prompts.map((p) => p.name)), [prompts]);

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
        <PromptsList
          data={prompts}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      ) : (
        <MarketplaceTab
          type="prompt"
          installedNames={installedNames}
          queryKeysToInvalidate={[["prompts"], ["registry"]]}
        />
      )}

      <PromptDialog
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

export default function PromptsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-muted-foreground">Loading&hellip;</div>
      }
    >
      <PromptsContent />
    </Suspense>
  );
}
