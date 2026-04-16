"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { SkillRow } from "../_hooks/use-skills";

interface SkillsListProps {
  data: SkillRow[];
  isLoading: boolean;
  onEdit: (skill: SkillRow) => void;
  onDelete: (name: string) => void;
}

export function SkillsList({
  data,
  isLoading,
  onEdit,
  onDelete,
}: SkillsListProps) {
  const t = useTranslations("skills");
  const tc = useTranslations("common");

  const columns: Column<SkillRow & Record<string, unknown>>[] = useMemo(
    () => [
      {
        key: "name",
        header: tc("name"),
        sortable: true,
        className: "min-w-[140px]",
        render: (row) => (
          <span className="font-mono text-sm">{row.name}</span>
        ),
      },
      {
        key: "description",
        header: tc("description"),
        sortable: true,
        className: "min-w-[180px] max-w-[280px]",
        render: (row) => (
          <span className="line-clamp-2 text-sm text-muted-foreground">
            {row.description || "\u2014"}
          </span>
        ),
      },
      {
        key: "content",
        header: tc("content"),
        className: "min-w-[200px] max-w-[320px]",
        render: (row) => (
          <span className="line-clamp-2 text-xs text-muted-foreground font-mono whitespace-pre-wrap">
            {row.content ? row.content.slice(0, 120) + (row.content.length > 120 ? "…" : "") : "\u2014"}
          </span>
        ),
      },
      {
        key: "enabled",
        header: tc("status"),
        sortable: true,
        sortValue: (row) => (row.enabled ? 1 : 0),
        render: (row) => <StatusBadge enabled={row.enabled} />,
      },
      {
        key: "updatedAt",
        header: tc("updated"),
        sortable: true,
        sortValue: (row) => row.updatedAt ?? "",
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "\u2014"}
          </span>
        ),
      },
      {
        key: "actions",
        header: tc("actions"),
        className: "text-end",
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(row as SkillRow)} aria-label={tc("edit")}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(row.name)} aria-label={tc("delete")}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [tc, onEdit, onDelete],
  );

  return (
    <DataTable
      data={data as (SkillRow & Record<string, unknown>)[]}
      columns={columns}
      keyFn={(row) => String(row.name)}
      searchFields={["name", "description", "content"]}
      emptyIcon={Sparkles}
      emptyMessage={t("emptyMessage")}
      isLoading={isLoading}
    />
  );
}
