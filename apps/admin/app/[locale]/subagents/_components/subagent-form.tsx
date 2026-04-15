"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AllowedRolesPicker } from "@/components/roles/allowed-roles-picker";
import type { RoleDefinition } from "@/lib/roles";
import type { SubagentRow } from "../_hooks/use-subagents";

interface SubagentFormProps {
  form: Partial<SubagentRow>;
  onChange: (patch: Partial<SubagentRow>) => void;
  roles: RoleDefinition[];
  isEditing: boolean;
}

export function SubagentForm({
  form,
  onChange,
  roles,
  isEditing,
}: SubagentFormProps) {
  const t = useTranslations("subagents");
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
        <Label htmlFor="model">{t("model")}</Label>
        <Input
          id="model"
          value={String(form.model ?? "")}
          onChange={(e) => onChange({ model: e.target.value })}
          placeholder="fast"
          className="mt-1 font-mono"
        />
      </div>

      <div>
        <Label htmlFor="content">{tc("content")}</Label>
        <Textarea
          id="content"
          rows={12}
          value={String(form.content ?? "")}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder={t("contentPlaceholder")}
          className="mt-1 font-mono text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="flex items-center justify-between rounded border p-3">
          <div>
            <div className="font-medium">{t("readonly")}</div>
            <div className="text-sm text-muted-foreground">
              {t("readonlyDesc")}
            </div>
          </div>
          <Switch
            checked={Boolean(form.readonly)}
            onCheckedChange={(v) => onChange({ readonly: v })}
          />
        </div>
        <div className="flex items-center justify-between rounded border p-3">
          <div>
            <div className="font-medium">{t("background")}</div>
            <div className="text-sm text-muted-foreground">
              {t("backgroundDesc")}
            </div>
          </div>
          <Switch
            checked={Boolean(form.isBackground)}
            onCheckedChange={(v) => onChange({ isBackground: v })}
          />
        </div>
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
