"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { JsonEditor } from "@/components/shared/json-editor";
import { AllowedRolesPicker } from "@/components/roles/allowed-roles-picker";
import type { DynamicToolEntry } from "@/lib/dynamic-registry-types";
import type { RoleDefinition } from "@/lib/roles";

interface ToolFormProps {
  form: Partial<DynamicToolEntry>;
  onChange: (patch: Partial<DynamicToolEntry>) => void;
  inputSchema: Record<string, unknown>;
  onSchemaChange: (value: Record<string, unknown>) => void;
  roles: RoleDefinition[];
  isEditing: boolean;
}

export function ToolForm({
  form,
  onChange,
  inputSchema,
  onSchemaChange,
  roles,
  isEditing,
}: ToolFormProps) {
  const t = useTranslations("tools");
  const tc = useTranslations("common");

  return (
    <>
      <div>
        <Label htmlFor="name">{tc("name")}</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={t("namePlaceholder")}
          required
          disabled={isEditing}
          className="mt-1 font-mono"
        />
      </div>

      <div>
        <Label htmlFor="description">{tc("description")}</Label>
        <Input
          id="description"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t("descriptionPlaceholder")}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="handlerRef">{t("handler")}</Label>
        <Input
          id="handlerRef"
          value={form.handlerRef}
          onChange={(e) => onChange({ handlerRef: e.target.value })}
          placeholder={t("handlerPlaceholder")}
          required
          className="mt-1 font-mono"
        />
      </div>

      <JsonEditor
        label={t("inputSchema")}
        value={inputSchema}
        onChange={onSchemaChange}
        placeholder={t("schemaPlaceholder")}
      />

      <AllowedRolesPicker
        roles={roles}
        value={form.allowedRoles ?? []}
        onChange={(v) => onChange({ allowedRoles: v })}
        entityLabel={t("title")}
      />

      <div className="flex items-center gap-2">
        <Switch
          checked={form.enabled ?? true}
          onCheckedChange={(c) => onChange({ enabled: c })}
        />
        <Label>{tc("enabled")}</Label>
      </div>
    </>
  );
}
