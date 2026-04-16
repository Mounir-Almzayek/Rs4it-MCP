"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EntityTabs, type EntityTab } from "@/components/shared/entity-tabs";
import { MarketplaceTab } from "@/components/shared/marketplace-tab";
import { useToast } from "@/lib/toast";
import { CommandsList } from "./_components/commands-list";
import { CommandDialog } from "./_components/command-dialog";
import { useCommands } from "./_hooks/use-commands";
import type { CommandRow } from "./_hooks/use-commands";

function CommandsContent() {
  const t = useTranslations("commands");
  const tc = useTranslations("common");
  const toast = useToast();

  const [tab, setTab] = useState<EntityTab>("list");

  const { commands, roles, isLoading, saveAllMutation } = useCommands();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommandRow | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((command: CommandRow) => {
    setEditing(command);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditing(null);
  }, []);

  const handleSubmit = useCallback(
    (form: Partial<CommandRow>, isEdit: boolean) => {
      const name = String(form.name ?? "").trim();
      if (!name) {
        toast.add("error", t("nameRequired"));
        return;
      }

      const next: CommandRow[] = commands.slice();
      const idx = next.findIndex(
        (c) => c.name === (isEdit ? editing?.name ?? name : name),
      );
      const row: CommandRow = {
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
    [commands, editing, saveAllMutation, toast, t],
  );

  const handleDeleteRequest = useCallback((name: string) => {
    setDeleteTarget(name);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    const next = commands.filter((c) => c.name !== deleteTarget);
    saveAllMutation.mutate(next, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, commands, saveAllMutation]);

  const installedNames = useMemo(() => new Set(commands.map((c) => c.name)), [commands]);

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
        <CommandsList
          data={commands}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      ) : (
        <MarketplaceTab
          type="command"
          installedNames={installedNames}
          queryKeysToInvalidate={[["commands"], ["registry"]]}
        />
      )}

      <CommandDialog
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

export default function CommandsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-muted-foreground">Loading&hellip;</div>
      }
    >
      <CommandsContent />
    </Suspense>
  );
}
