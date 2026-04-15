"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { EntityDialog } from "@/components/shared/entity-dialog";
import { SkillForm } from "./skill-form";
import { useToast } from "@/lib/toast";
import type { RoleDefinition } from "@/lib/roles";
import type { SkillRow } from "../_hooks/use-skills";

interface SkillDialogProps {
  open: boolean;
  onClose: () => void;
  editing: SkillRow | null;
  roles: RoleDefinition[];
  onSubmit: (form: Partial<SkillRow>, contentMd: string, isEdit: boolean) => void;
  loading: boolean;
}

const DEFAULT_MD = `# Skill title

Write instructions for the model here (Markdown). No JSON block is required.

Optional: add a \`\`\`json\`\`\` block only if you need a fixed sequence of Hub tools (\`steps\`) or \`inputSchema\`.
`;

const EMPTY_FORM: Partial<SkillRow> = {
  name: "",
  description: "",
  enabled: true,
  allowedRoles: [],
};

export function SkillDialog({
  open,
  onClose,
  editing,
  roles,
  onSubmit,
  loading,
}: SkillDialogProps) {
  const t = useTranslations("skills");

  const [form, setForm] = useState<Partial<SkillRow>>(EMPTY_FORM);
  const [contentMd, setContentMd] = useState(DEFAULT_MD);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        enabled: editing.enabled !== false,
        allowedRoles: (editing.allowedRoles ?? []) as string[],
      });
      setContentMd(String(editing.content ?? ""));
    } else {
      setForm(EMPTY_FORM);
      setContentMd(DEFAULT_MD);
    }
  }, [editing, open]);

  const handleChange = useCallback(
    (patch: Partial<SkillRow>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  function handleSubmit() {
    onSubmit(form, contentMd, !!editing);
  }

  return (
    <EntityDialog
      open={open}
      onClose={onClose}
      title={editing ? t("edit") : t("create")}
      onSubmit={handleSubmit}
      loading={loading}
    >
      <SkillForm
        form={form}
        onChange={handleChange}
        contentMd={contentMd}
        onContentChange={setContentMd}
        roles={roles}
        isEditing={!!editing}
      />
    </EntityDialog>
  );
}
