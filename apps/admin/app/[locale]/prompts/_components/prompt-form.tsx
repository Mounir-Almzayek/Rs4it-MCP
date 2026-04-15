"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AllowedRolesPicker } from "@/components/roles/allowed-roles-picker";
import type { RoleDefinition } from "@/lib/roles";
import type { PromptRow } from "../_hooks/use-prompts";

interface PromptFormProps {
  form: Partial<PromptRow>;
  onChange: (patch: Partial<PromptRow>) => void;
  roles: RoleDefinition[];
  isEditing: boolean;
}

export function PromptForm({
  form,
  onChange,
  roles,
  isEditing,
}: PromptFormProps) {
  const t = useTranslations("prompts");
  const tc = useTranslations("common");

  return (
    <>
      <div>
        <Label htmlFor="name">{tc("name")}</Label>
        <Input
          id="name"
          value={String(form.name ?? "")}
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
          value={String(form.description ?? "")}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t("descriptionPlaceholder")}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="content">{tc("content")}</Label>
        <Textarea
          id="content"
          rows={10}
          value={String(form.content ?? "")}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder={t("contentPlaceholder")}
          className="mt-1 font-mono text-sm"
        />
      </div>

      <AllowedRolesPicker
        roles={roles}
        value={Array.isArray(form.allowedRoles) ? (form.allowedRoles as string[]) : []}
        onChange={(v) => onChange({ allowedRoles: v })}
        entityLabel={t("title")}
      />

      <div className="flex items-center gap-2">
        <Switch
          checked={Boolean(form.enabled ?? true)}
          onCheckedChange={(c) => onChange({ enabled: c })}
        />
        <Label>{tc("enabled")}</Label>
      </div>
    </>
  );
}
