"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { ToolForm } from "./tool-form";
import { useToast } from "@/lib/toast";
import type { DynamicToolEntry } from "@/lib/dynamic-registry-types";
import type { RoleDefinition } from "@/lib/roles";

interface ToolDialogProps {
  open: boolean;
  onClose: () => void;
  editing: DynamicToolEntry | null;
  roles: RoleDefinition[];
  onSubmit: (payload: Partial<DynamicToolEntry>, isEdit: boolean) => void;
  loading: boolean;
}

const EMPTY_FORM: Partial<DynamicToolEntry> = {
  name: "",
  description: "",
  inputSchema: {},
  handlerRef: "",
  enabled: true,
  allowedRoles: [],
};

export function ToolDialog({
  open,
  onClose,
  editing,
  roles,
  onSubmit,
  loading,
}: ToolDialogProps) {
  const t = useTranslations("tools");
  const toast = useToast();

  const [form, setForm] = useState<Partial<DynamicToolEntry>>(EMPTY_FORM);
  const [inputSchema, setInputSchema] = useState<Record<string, unknown>>({});

  // Reset form when editing changes or dialog opens
  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description,
        inputSchema: editing.inputSchema,
        handlerRef: editing.handlerRef,
        enabled: editing.enabled,
        allowedRoles: editing.allowedRoles ?? [],
      });
      setInputSchema(editing.inputSchema ?? {});
    } else {
      setForm(EMPTY_FORM);
      setInputSchema({});
    }
  }, [editing, open]);

  const handleChange = useCallback(
    (patch: Partial<DynamicToolEntry>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  function handleSubmit() {
    const payload = {
      ...form,
      inputSchema,
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
      <ToolForm
        form={form}
        onChange={handleChange}
        inputSchema={inputSchema}
        onSchemaChange={setInputSchema}
        roles={roles}
        isEditing={!!editing}
      />
    </EntityDialog>
  );
}
