"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { SubagentRow } from "../_hooks/use-subagents";

interface SubagentsListProps {
  data: SubagentRow[];
  isLoading: boolean;
  onEdit: (subagent: SubagentRow) => void;
  onDelete: (name: string) => void;
}

export function SubagentsList({
  data,
  isLoading,
  onEdit,
  onDelete,
}: SubagentsListProps) {
  const t = useTranslations("subagents");
  const tc = useTranslations("common");

  const columns: Column<SubagentRow & Record<string, unknown>>[] = useMemo(
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
        key: "model",
        header: t("model"),
        sortable: true,
        className: "min-w-[100px]",
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.model || "inherit"}
          </span>
        ),
      },
      {
        key: "flags",
        header: tc("status"),
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1">
            <StatusBadge enabled={row.enabled} />
            {row.readonly && <Badge variant="outline">{t("readonly")}</Badge>}
            {row.isBackground && <Badge variant="outline">{t("background")}</Badge>}
          </div>
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
            <Button variant="ghost" size="icon" onClick={() => onEdit(row as SubagentRow)} aria-label={tc("edit")}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(row.name)} aria-label={tc("delete")}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [tc, t, onEdit, onDelete],
  );

  return (
    <DataTable
      data={data as (SubagentRow & Record<string, unknown>)[]}
      columns={columns}
      keyFn={(row) => String(row.name)}
      searchFields={["name", "description", "content", "model"]}
      emptyIcon={Bot}
      emptyMessage={t("emptyMessage")}
      isLoading={isLoading}
    />
  );
}
