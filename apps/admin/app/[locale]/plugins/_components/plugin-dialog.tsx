"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { PluginForm } from "./plugin-form";
import { useToast } from "@/lib/toast";
import type { DynamicPluginEntry } from "@/lib/dynamic-registry-types";
import type { RoleDefinition } from "@/lib/roles";

interface PluginDialogProps {
  open: boolean;
  onClose: () => void;
  editing: DynamicPluginEntry | null;
  roles: RoleDefinition[];
  onSubmit: (payload: Partial<DynamicPluginEntry>, argsStr: string, isEdit: boolean) => void;
  loading: boolean;
}

const EMPTY_FORM: Partial<DynamicPluginEntry> = {
  id: "",
  name: "",
  command: "npx",
  args: ["-y", "package@latest"],
  description: "",
  enabled: true,
  allowedRoles: [],
};

export function PluginDialog({
  open,
  onClose,
  editing,
  roles,
  onSubmit,
  loading,
}: PluginDialogProps) {
  const t = useTranslations("plugins");

  const [form, setForm] = useState<Partial<DynamicPluginEntry>>(EMPTY_FORM);
  const [argsStr, setArgsStr] = useState('["-y", "package@latest"]');

  useEffect(() => {
    if (editing) {
      setForm({
        id: editing.id,
        name: editing.name,
        command: editing.command,
        args: editing.args,
        description: editing.description,
        enabled: editing.enabled,
        allowedRoles: editing.allowedRoles ?? [],
      });
      setArgsStr(JSON.stringify(editing.args ?? [], null, 2));
    } else {
      setForm(EMPTY_FORM);
      setArgsStr('["-y", "package@latest"]');
    }
  }, [editing, open]);

  const handleChange = useCallback(
    (patch: Partial<DynamicPluginEntry>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  function handleSubmit() {
    onSubmit(form, argsStr, !!editing);
  }

  return (
    <EntityDialog
      open={open}
      onClose={onClose}
      title={editing ? t("edit") : t("create")}
      onSubmit={handleSubmit}
      loading={loading}
    >
      <PluginForm
        form={form}
        onChange={handleChange}
        argsStr={argsStr}
        onArgsStrChange={setArgsStr}
        roles={roles}
        isEditing={!!editing}
      />
    </EntityDialog>
  );
}
