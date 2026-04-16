"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EntityTabs, type EntityTab } from "@/components/shared/entity-tabs";
import { MarketplaceTab } from "@/components/shared/marketplace-tab";
import { useToast } from "@/lib/toast";
import { PluginsTable } from "./_components/plugins-table";
import { PluginDialog } from "./_components/plugin-dialog";
import { usePlugins } from "./_hooks/use-plugins";
import type { DynamicPluginEntry } from "@/lib/dynamic-registry-types";

function PluginsContent() {
  const t = useTranslations("plugins");
  const tc = useTranslations("common");
  const toast = useToast();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<EntityTab>("list");

  const {
    plugins,
    pluginStatus,
    connectionById,
    roles,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  } = usePlugins();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DynamicPluginEntry | null>(null);

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

  const handleEdit = useCallback((plugin: DynamicPluginEntry) => {
    setEditing(plugin);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditing(null);
  }, []);

  const handleSubmit = useCallback(
    (
      payload: Partial<DynamicPluginEntry>,
      argsStr: string,
      isEdit: boolean,
    ) => {
      let args: string[] = [];
      try {
        args = JSON.parse(argsStr);
        if (!Array.isArray(args)) args = [];
      } catch {
        toast.add("error", t("invalidArgs"));
        return;
      }
      const body = {
        ...payload,
        args,
        allowedRoles:
          (payload.allowedRoles?.length ?? 0) > 0
            ? payload.allowedRoles
            : undefined,
      };
      if (isEdit && editing) {
        updateMutation.mutate(
          { id: editing.id, body },
          {
            onSuccess: () => {
              setDialogOpen(false);
              setEditing(null);
            },
          },
        );
      } else {
        createMutation.mutate(body as DynamicPluginEntry, {
          onSuccess: () => {
            setDialogOpen(false);
            setEditing(null);
          },
        });
      }
    },
    [editing, createMutation, updateMutation, toast, t],
  );

  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteTarget(id);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteMutation]);

  const installedNames = useMemo(() => new Set(plugins.map((p) => p.name)), [plugins]);

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
        <PluginsTable
          data={plugins}
          roles={roles}
          connectionById={connectionById}
          pluginStatus={pluginStatus}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      ) : (
        <MarketplaceTab
          type="plugin"
          installedNames={installedNames}
          queryKeysToInvalidate={[["plugins"], ["plugin-status"]]}
        />
      )}

      <PluginDialog
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

export default function PluginsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-muted-foreground">Loading&hellip;</div>
      }
    >
      <PluginsContent />
    </Suspense>
  );
}
