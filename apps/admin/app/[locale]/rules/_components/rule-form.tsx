"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AllowedRolesPicker } from "@/components/roles/allowed-roles-picker";
import type { DynamicRuleEntry } from "@/lib/dynamic-registry-types";
import type { RoleDefinition } from "@/lib/roles";

interface RuleFormProps {
  form: Partial<DynamicRuleEntry>;
  onChange: (patch: Partial<DynamicRuleEntry>) => void;
  roles: RoleDefinition[];
  isEditing: boolean;
}

export function RuleForm({
  form,
  onChange,
  roles,
  isEditing,
}: RuleFormProps) {
  const t = useTranslations("rules");
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
          value={form.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t("descriptionPlaceholder")}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="globs">{t("globs")}</Label>
        <Input
          id="globs"
          value={form.globs ?? ""}
          onChange={(e) => onChange({ globs: e.target.value })}
          placeholder={t("globsPlaceholder")}
          className="mt-1 font-mono"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("globsHint")}
        </p>
      </div>

      <div>
        <Label htmlFor="content">{tc("content")} (Markdown)</Label>
        <Textarea
          id="content"
          value={form.content ?? ""}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder={t("contentPlaceholder")}
          rows={12}
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
