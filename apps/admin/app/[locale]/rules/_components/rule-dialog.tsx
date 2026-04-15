"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { RuleForm } from "./rule-form";
import type { DynamicRuleEntry } from "@/lib/dynamic-registry-types";
import type { RoleDefinition } from "@/lib/roles";

interface RuleDialogProps {
  open: boolean;
  onClose: () => void;
  editing: DynamicRuleEntry | null;
  roles: RoleDefinition[];
  onSubmit: (payload: Partial<DynamicRuleEntry>, isEdit: boolean) => void;
  loading: boolean;
}

const EMPTY_FORM: Partial<DynamicRuleEntry> = {
  name: "",
  description: "",
  content: "",
  globs: "",
  enabled: true,
  allowedRoles: [],
};

export function RuleDialog({
  open,
  onClose,
  editing,
  roles,
  onSubmit,
  loading,
}: RuleDialogProps) {
  const t = useTranslations("rules");

  const [form, setForm] = useState<Partial<DynamicRuleEntry>>(EMPTY_FORM);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        content: editing.content ?? "",
        globs: editing.globs ?? "",
        enabled: editing.enabled,
        allowedRoles: editing.allowedRoles ?? [],
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing, open]);

  const handleChange = useCallback(
    (patch: Partial<DynamicRuleEntry>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  function handleSubmit() {
    const payload = {
      ...form,
      globs: form.globs?.trim() ? form.globs : undefined,
      allowedRoles:
        (form.allowedRoles?.length ?? 0) > 0 ? form.allowedRoles : undefined,
    };
    onSubmit(payload, !!editing);
  }

  return (
    <EntityDialog
      open={open}
      onClose={onClose}
      title={editing ? t("edit") : t("create")}
      onSubmit={handleSubmit}
      loading={loading}
    >
      <RuleForm
        form={form}
        onChange={handleChange}
        roles={roles}
        isEditing={!!editing}
      />
    </EntityDialog>
  );
}
