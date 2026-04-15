"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AllowedRolesPicker } from "@/components/roles/allowed-roles-picker";
import type { DynamicResourceEntry } from "@/lib/dynamic-registry-types";
import type { RoleDefinition } from "@/lib/roles";

interface ResourceFormProps {
  form: Partial<DynamicResourceEntry>;
  onChange: (patch: Partial<DynamicResourceEntry>) => void;
  roles: RoleDefinition[];
  isEditing: boolean;
}

export function ResourceForm({
  form,
  onChange,
  roles,
  isEditing,
}: ResourceFormProps) {
  const t = useTranslations("resources");
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
        <Label htmlFor="uri">{t("uri")}</Label>
        <Input
          id="uri"
          value={form.uri ?? ""}
          onChange={(e) => onChange({ uri: e.target.value })}
          placeholder={t("uriPlaceholder")}
          required
          className="mt-1 font-mono"
        />
      </div>

      <div>
        <Label htmlFor="description">{tc("description")}</Label>
        <Input
          id="description"
          value={form.description ?? ""}
          onChange={(e) =>
            onChange({ description: e.target.value || undefined })
          }
          placeholder={t("descriptionPlaceholder")}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="mimeType">{t("mimeType")}</Label>
        <Input
          id="mimeType"
          value={form.mimeType ?? "text/plain"}
          onChange={(e) => onChange({ mimeType: e.target.value })}
          placeholder={t("mimeTypePlaceholder")}
          className="mt-1 font-mono"
        />
      </div>

      <div>
        <Label htmlFor="content">{tc("content")}</Label>
        <Textarea
          id="content"
          value={form.content ?? ""}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder={t("contentPlaceholder")}
          rows={10}
          required
          className="mt-1 font-mono text-sm"
        />
      </div>

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
