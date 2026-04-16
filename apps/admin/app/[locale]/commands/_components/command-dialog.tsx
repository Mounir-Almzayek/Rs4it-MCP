"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { CommandForm } from "./command-form";
import type { RoleDefinition } from "@/lib/roles";
import type { CommandRow } from "../_hooks/use-commands";
import { DEFAULT_COMMAND_CONTENT } from "../_hooks/use-commands";

interface CommandDialogProps {
  open: boolean;
  onClose: () => void;
  editing: CommandRow | null;
  roles: RoleDefinition[];
  onSubmit: (form: Partial<CommandRow>, isEdit: boolean) => void;
  loading: boolean;
}

const EMPTY_FORM: Partial<CommandRow> = {
  name: "",
  description: "",
  content: DEFAULT_COMMAND_CONTENT,
  enabled: true,
  allowedRoles: [],
};

export function CommandDialog({
  open,
  onClose,
  editing,
  roles,
  onSubmit,
  loading,
}: CommandDialogProps) {
  const t = useTranslations("commands");

  const [form, setForm] = useState<Partial<CommandRow>>(EMPTY_FORM);

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
    (patch: Partial<CommandRow>) => {
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
      <CommandForm
        form={form}
        onChange={handleChange}
        roles={roles}
        isEditing={!!editing}
      />
    </EntityDialog>
  );
}
