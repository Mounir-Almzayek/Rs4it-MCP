"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { ResourceForm } from "./resource-form";
import type { DynamicResourceEntry } from "@/lib/dynamic-registry-types";
import type { RoleDefinition } from "@/lib/roles";

interface ResourceDialogProps {
  open: boolean;
  onClose: () => void;
  editing: DynamicResourceEntry | null;
  roles: RoleDefinition[];
  onSubmit: (payload: Partial<DynamicResourceEntry>, isEdit: boolean) => void;
  loading: boolean;
}

const EMPTY_FORM: Partial<DynamicResourceEntry> = {
  name: "",
  uri: "",
  description: "",
  mimeType: "text/plain",
  content: "",
  enabled: true,
  allowedRoles: [],
};

export function ResourceDialog({
  open,
  onClose,
  editing,
  roles,
  onSubmit,
  loading,
}: ResourceDialogProps) {
  const t = useTranslations("resources");

  const [form, setForm] = useState<Partial<DynamicResourceEntry>>(EMPTY_FORM);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        uri: editing.uri,
        description: editing.description,
        mimeType: editing.mimeType,
        content: editing.content,
        enabled: editing.enabled,
        allowedRoles: editing.allowedRoles ?? [],
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing, open]);

  const handleChange = useCallback(
    (patch: Partial<DynamicResourceEntry>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  function handleSubmit() {
    const payload = {
      ...form,
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
      <ResourceForm
        form={form}
        onChange={handleChange}
        roles={roles}
        isEditing={!!editing}
      />
    </EntityDialog>
  );
}
