"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { PromptForm } from "./prompt-form";
import type { RoleDefinition } from "@/lib/roles";
import type { PromptRow } from "../_hooks/use-prompts";

interface PromptDialogProps {
  open: boolean;
  onClose: () => void;
  editing: PromptRow | null;
  roles: RoleDefinition[];
  onSubmit: (form: Partial<PromptRow>, isEdit: boolean) => void;
  loading: boolean;
}

const EMPTY_FORM: Partial<PromptRow> = {
  name: "",
  description: "",
  content: "",
  enabled: true,
  allowedRoles: [],
};

export function PromptDialog({
  open,
  onClose,
  editing,
  roles,
  onSubmit,
  loading,
}: PromptDialogProps) {
  const t = useTranslations("prompts");

  const [form, setForm] = useState<Partial<PromptRow>>(EMPTY_FORM);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        content: editing.content ?? "",
        enabled: editing.enabled !== false,
        allowedRoles: (editing.allowedRoles ?? []) as string[],
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing, open]);

  const handleChange = useCallback(
    (patch: Partial<PromptRow>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  function handleSubmit() {
    onSubmit(form, !!editing);
  }

  return (
    <EntityDialog
      open={open}
      onClose={onClose}
      title={editing ? t("edit") : t("create")}
      onSubmit={handleSubmit}
      loading={loading}
    >
      <PromptForm
        form={form}
        onChange={handleChange}
        roles={roles}
        isEditing={!!editing}
      />
    </EntityDialog>
  );
}
