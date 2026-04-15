"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
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

  const sorted = useMemo(
    () => data.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (sorted.length === 0) {
    return <EmptyState icon={Bot} message={t("emptyMessage")} />;
  }

  return (
    <ul className="space-y-2">
      {sorted.map((s) => (
        <li key={s.name} className="rounded border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{s.name}</span>
                <StatusBadge enabled={s.enabled} />
              </div>
              {s.description ? (
                <div className="text-sm text-muted-foreground">
                  {s.description}
                </div>
              ) : null}
              <div className="mt-2 text-xs text-muted-foreground">
                {t("model")}: {s.model ?? "inherit"} | {t("readonly")}:{" "}
                {String(Boolean(s.readonly))} | {t("background")}:{" "}
                {String(Boolean(s.isBackground))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(s)}
                aria-label={tc("edit")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(s.name)}
                aria-label={tc("delete")}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
