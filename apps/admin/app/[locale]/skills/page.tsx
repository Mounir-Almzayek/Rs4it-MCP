"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EntityTabs, type EntityTab } from "@/components/shared/entity-tabs";
import { MarketplaceTab } from "@/components/shared/marketplace-tab";
import { UploadDialog } from "./_components/upload-dialog";
import { useToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { SkillsList } from "./_components/skills-list";
import { SkillDialog } from "./_components/skill-dialog";
import { useSkills } from "./_hooks/use-skills";
import type { SkillRow } from "./_hooks/use-skills";

function SkillsContent() {
  const t = useTranslations("skills");
  const tc = useTranslations("common");
  const toast = useToast();

  const { skills, roles, isLoading, saveAllMutation } = useSkills();

  const [tab, setTab] = useState<EntityTab>("list");
  const [uploadOpen, setUploadOpen] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SkillRow | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const installedNames = useMemo(() => new Set(skills.map((s) => s.name)), [skills]);

  const handleCreate = useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((skill: SkillRow) => {
    setEditing(skill);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditing(null);
  }, []);

  const handleSubmit = useCallback(
    (form: Partial<SkillRow>, contentMd: string, isEdit: boolean) => {
      const name = String(form.name ?? "").trim();
      if (!name) {
        toast.add("error", t("nameRequired"));
        return;
      }

      const next: SkillRow[] = skills.slice();
      const idx = next.findIndex(
        (s) => s.name === (isEdit ? editing?.name ?? name : name),
      );
      const row: SkillRow = {
        name,
        description: (String(form.description ?? "").trim() || null) as string | null,
        content: contentMd,
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
    [skills, editing, saveAllMutation, toast, t],
  );

  const handleDeleteRequest = useCallback((name: string) => {
    setDeleteTarget(name);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    const next = skills.filter((s) => s.name !== deleteTarget);
    saveAllMutation.mutate(next, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, skills, saveAllMutation]);

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={t("title")}
        createLabel={t("create")}
        onCreate={handleCreate}
        actions={
          <Button variant="secondary" onClick={() => setUploadOpen(true)} className="gap-1.5">
            <Upload className="h-4 w-4" />
            {t("upload")}
          </Button>
        }
      />

      <EntityTabs
        tab={tab}
        onTabChange={setTab}
        listLabel={t("title")}
        marketplaceLabel={tc("marketplace")}
      />

      {tab === "list" ? (
        <SkillsList
          data={skills}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      ) : (
        <MarketplaceTab
          type="skill"
          installedNames={installedNames}
          queryKeysToInvalidate={[["skills"]]}
        />
      )}

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />

      <SkillDialog
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

export default function SkillsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-muted-foreground">Loading&hellip;</div>
      }
    >
      <SkillsContent />
    </Suspense>
  );
}
