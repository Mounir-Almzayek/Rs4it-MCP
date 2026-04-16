"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EntityTabs, type EntityTab } from "@/components/shared/entity-tabs";
import { MarketplaceTab } from "@/components/shared/marketplace-tab";
import { ToolsTable } from "./_components/tools-table";
import { ToolDialog } from "./_components/tool-dialog";
import { useTools } from "./_hooks/use-tools";
import type { DynamicToolEntry } from "@/lib/dynamic-registry-types";

function ToolsContent() {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();

  const {
    toolRows,
    roles,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useTools();

  const [tab, setTab] = useState<EntityTab>("list");

  const installedToolNames = useMemo(() => {
    const names = new Set<string>();
    for (const row of toolRows) {
      if ("isPluginTool" in row && row.isPluginTool) continue;
      names.add(row.name);
    }
    return names;
  }, [toolRows]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DynamicToolEntry | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Auto-open create dialog from search params
  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setEditing(null);
      setDialogOpen(true);
    }
  }, [searchParams]);

  const handleCreate = useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((tool: DynamicToolEntry) => {
    setEditing(tool);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditing(null);
  }, []);

  const handleSubmit = useCallback(
    (payload: Partial<DynamicToolEntry>, isEdit: boolean) => {
      if (isEdit && editing) {
        updateMutation.mutate(
          { id: editing.name, body: payload },
          {
            onSuccess: () => {
              setDialogOpen(false);
              setEditing(null);
            },
          },
        );
      } else {
        createMutation.mutate(payload as DynamicToolEntry, {
          onSuccess: () => {
            setDialogOpen(false);
            setEditing(null);
          },
        });
      }
    },
    [editing, createMutation, updateMutation],
  );

  const handleDeleteRequest = useCallback((name: string) => {
    setDeleteTarget(name);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteMutation]);

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
        <ToolsTable
          data={toolRows}
          roles={roles}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      ) : (
        <MarketplaceTab
          type="tool"
          installedNames={installedToolNames}
          queryKeysToInvalidate={[["tools"]]}
        />
      )}

      <ToolDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        editing={editing}
        roles={roles}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDelete
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        name={deleteTarget ?? ""}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

export default function ToolsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-muted-foreground">Loading\u2026</div>
      }
    >
      <ToolsContent />
    </Suspense>
  );
}
