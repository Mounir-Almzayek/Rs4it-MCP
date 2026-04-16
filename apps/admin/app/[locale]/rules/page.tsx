"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EntityTabs, type EntityTab } from "@/components/shared/entity-tabs";
import { MarketplaceTab } from "@/components/shared/marketplace-tab";
import { RulesTable } from "./_components/rules-table";
import { RuleDialog } from "./_components/rule-dialog";
import { useRules } from "./_hooks/use-rules";
import type { DynamicRuleEntry } from "@/lib/dynamic-registry-types";

function RulesContent() {
  const t = useTranslations("rules");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<EntityTab>("list");

  const {
    rules,
    roles,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useRules();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DynamicRuleEntry | null>(null);

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

  const handleEdit = useCallback((rule: DynamicRuleEntry) => {
    setEditing(rule);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditing(null);
  }, []);

  const handleSubmit = useCallback(
    (payload: Partial<DynamicRuleEntry>, isEdit: boolean) => {
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
        createMutation.mutate(payload as DynamicRuleEntry, {
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

  const installedNames = useMemo(() => new Set(rules.map((r) => r.name)), [rules]);

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
        <RulesTable
          data={rules}
          roles={roles}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      ) : (
        <MarketplaceTab
          type="rule"
          installedNames={installedNames}
          queryKeysToInvalidate={[["rules"], ["registry"]]}
        />
      )}

      <RuleDialog
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

export default function RulesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-muted-foreground">Loading&hellip;</div>
      }
    >
      <RulesContent />
    </Suspense>
  );
}
