"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { PromptRow } from "../_hooks/use-prompts";

interface PromptsListProps {
  data: PromptRow[];
  isLoading: boolean;
  onEdit: (prompt: PromptRow) => void;
  onDelete: (name: string) => void;
}

export function PromptsList({
  data,
  isLoading,
  onEdit,
  onDelete,
}: PromptsListProps) {
  const t = useTranslations("prompts");
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
    return <EmptyState icon={MessageSquare} message={t("emptyMessage")} />;
  }

  return (
    <ul className="space-y-2">
      {sorted.map((p) => (
        <li key={p.name} className="rounded border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{p.name}</span>
                <StatusBadge enabled={p.enabled} />
              </div>
              {p.description ? (
                <div className="text-sm text-muted-foreground">
                  {p.description}
                </div>
              ) : null}
              <div className="mt-2 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                {p.content}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(p)}
                aria-label={tc("edit")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(p.name)}
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
