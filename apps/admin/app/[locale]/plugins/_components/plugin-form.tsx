"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AllowedRolesPicker } from "@/components/roles/allowed-roles-picker";
import type { DynamicPluginEntry } from "@/lib/dynamic-registry-types";
import type { RoleDefinition } from "@/lib/roles";

interface PluginFormProps {
  form: Partial<DynamicPluginEntry>;
  onChange: (patch: Partial<DynamicPluginEntry>) => void;
  argsStr: string;
  onArgsStrChange: (value: string) => void;
  roles: RoleDefinition[];
  isEditing: boolean;
}

export function PluginForm({
  form,
  onChange,
  argsStr,
  onArgsStrChange,
  roles,
  isEditing,
}: PluginFormProps) {
  const t = useTranslations("plugins");
  const tc = useTranslations("common");

  const resolvedPreview = (() => {
    try {
      const a = JSON.parse(argsStr);
      return Array.isArray(a) ? a.join(" ") : argsStr;
    } catch {
      return argsStr;
    }
  })();

  return (
    <>
      <div>
        <Label htmlFor="id">{t("id")}</Label>
        <Input
          id="id"
          value={form.id}
          onChange={(e) => onChange({ id: e.target.value })}
          placeholder={t("idPlaceholder")}
          required
          disabled={isEditing}
          className="mt-1 font-mono"
        />
      </div>

      <div>
        <Label htmlFor="name">{tc("name")}</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={t("namePlaceholder")}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="command">{t("command")}</Label>
        <Input
          id="command"
          value={form.command}
          onChange={(e) => onChange({ command: e.target.value })}
          placeholder={t("commandPlaceholder")}
          className="mt-1 font-mono"
        />
      </div>

      <div>
        <Label htmlFor="args">{t("args")} (JSON)</Label>
        <Input
          id="args"
          value={argsStr}
          onChange={(e) => onArgsStrChange(e.target.value)}
          placeholder={t("argsPlaceholder")}
          className="mt-1 font-mono"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("resolvedCommand")}: {form.command} {resolvedPreview}
        </p>
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
