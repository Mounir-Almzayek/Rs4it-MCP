"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EntityTabs, type EntityTab } from "@/components/shared/entity-tabs";
import { MarketplaceTab } from "@/components/shared/marketplace-tab";
import { ResourcesTable } from "./_components/resources-table";
import { ResourceDialog } from "./_components/resource-dialog";
import { useResources } from "./_hooks/use-resources";
import type { DynamicResourceEntry } from "@/lib/dynamic-registry-types";

function ResourcesContent() {
  const t = useTranslations("resources");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<EntityTab>("list");

  const {
    resourceRows,
    roles,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useResources();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DynamicResourceEntry | null>(null);

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

  const handleEdit = useCallback((resource: DynamicResourceEntry) => {
    setEditing(resource);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditing(null);
  }, []);

  const handleSubmit = useCallback(
    (payload: Partial<DynamicResourceEntry>, isEdit: boolean) => {
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
        createMutation.mutate(payload as DynamicResourceEntry, {
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

  const installedNames = useMemo(
    () => new Set(resourceRows.map((r) => r.name)),
    [resourceRows],
  );

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
        <ResourcesTable
          data={resourceRows}
          roles={roles}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      ) : (
        <MarketplaceTab
          type="resource"
          installedNames={installedNames}
          queryKeysToInvalidate={[["resources"], ["registry"]]}
        />
      )}

      <ResourceDialog
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

export default function ResourcesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-muted-foreground">Loading&hellip;</div>
      }
    >
      <ResourcesContent />
    </Suspense>
  );
}
