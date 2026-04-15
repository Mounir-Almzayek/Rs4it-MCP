"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
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
    return <EmptyState icon={Sparkles} message={t("emptyMessage")} />;
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
              <div className="mt-2 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                {s.content}
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
