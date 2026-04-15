"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { SubagentForm } from "./subagent-form";
import type { RoleDefinition } from "@/lib/roles";
import type { SubagentRow } from "../_hooks/use-subagents";
import { DEFAULT_SUBAGENT_CONTENT } from "../_hooks/use-subagents";

interface SubagentDialogProps {
  open: boolean;
  onClose: () => void;
  editing: SubagentRow | null;
  roles: RoleDefinition[];
  onSubmit: (form: Partial<SubagentRow>, isEdit: boolean) => void;
  loading: boolean;
}

const EMPTY_FORM: Partial<SubagentRow> = {
  name: "",
  description: "",
  content: DEFAULT_SUBAGENT_CONTENT,
  model: "fast",
  readonly: false,
  isBackground: false,
  enabled: true,
  allowedRoles: [],
};

export function SubagentDialog({
  open,
  onClose,
  editing,
  roles,
  onSubmit,
  loading,
}: SubagentDialogProps) {
  const t = useTranslations("subagents");

  const [form, setForm] = useState<Partial<SubagentRow>>(EMPTY_FORM);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        content: editing.content ?? "",
        model: editing.model ?? "fast",
        readonly: Boolean(editing.readonly),
        isBackground: Boolean(editing.isBackground),
        enabled: editing.enabled !== false,
        allowedRoles: (editing.allowedRoles ?? []) as string[],
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing, open]);

  const handleChange = useCallback(
    (patch: Partial<SubagentRow>) => {
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
      <SubagentForm
        form={form}
        onChange={handleChange}
        roles={roles}
        isEditing={!!editing}
      />
    </EntityDialog>
  );
}
