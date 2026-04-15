"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DynamicResourceEntry } from "@/lib/dynamic-registry-types";
import type { RoleDefinition } from "@/lib/roles";
import type { ResourceRow } from "../_hooks/use-resources";

interface ResourcesTableProps {
  data: ResourceRow[];
  roles: RoleDefinition[];
  isLoading: boolean;
  onEdit: (resource: DynamicResourceEntry) => void;
  onDelete: (name: string) => void;
}

export function ResourcesTable({
  data,
  roles,
  isLoading,
  onEdit,
  onDelete,
}: ResourcesTableProps) {
  const t = useTranslations("resources");
  const tc = useTranslations("common");

  const columns: Column<ResourceRow & Record<string, unknown>>[] = useMemo(
    () => [
      {
        key: "name",
        header: tc("name"),
        sortable: true,
        className: "min-w-[120px]",
        render: (row) => (
          <span className="font-mono text-sm">{row.name}</span>
        ),
      },
      {
        key: "uri",
        header: t("uri"),
        sortable: true,
        className: "min-w-[160px] max-w-[200px]",
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.uri}
          </span>
        ),
      },
      {
        key: "description",
        header: tc("description"),
        sortable: true,
        className: "min-w-[140px] max-w-[220px]",
        render: (row) => (
          <span className="line-clamp-2 text-sm text-muted-foreground">
            {row.description || "\u2014"}
          </span>
        ),
      },
      {
        key: "mimeType",
        header: t("mimeType"),
        sortable: true,
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.mimeType}
          </span>
        ),
      },
      {
        key: "source",
        header: tc("source"),
        sortable: true,
        render: (row) => (
          <Badge variant={row.source === "mcp" ? "secondary" : "outline"}>
            {row.source === "mcp" ? tc("mcp") : tc("admin")}
          </Badge>
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
        key: "allowedRoles",
        header: tc("allowedRoles"),
        className: "min-w-[140px]",
        render: (row) => {
          const items = row.allowedRoles ?? [];
          if (items.length === 0)
            return (
              <span className="text-muted-foreground">&mdash;</span>
            );
          return (
            <div className="flex flex-wrap gap-1">
              {items.map((r: string) => (
                <Badge key={r} variant="outline" className="me-1 mb-1">
                  {roles.find((x) => x.id === r)?.name ?? r}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        key: "updatedAt",
        header: tc("updated"),
        sortable: true,
        sortValue: (row) => row.updatedAt ?? "",
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.updatedAt
              ? new Date(row.updatedAt).toLocaleDateString()
              : "\u2014"}
          </span>
        ),
      },
      {
        key: "actions",
        header: tc("actions"),
        className: "text-end",
        render: (row) => {
          if (row.isPluginResource) {
            return (
              <span className="text-xs text-muted-foreground">
                {tc("readOnly")}
              </span>
            );
          }
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(row as DynamicResourceEntry)}
                aria-label={tc("edit")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(row.name)}
                aria-label={tc("delete")}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        },
      },
    ],
    [tc, t, roles, onEdit, onDelete],
  );

  return (
    <DataTable
      data={data as (ResourceRow & Record<string, unknown>)[]}
      columns={columns}
      keyFn={(row) =>
        row.source === "mcp"
          ? `${row.origin}:${row.name}`
          : String(row.name)
      }
      searchFields={["name", "uri", "description"]}
      emptyIcon={Database}
      emptyMessage={t("emptyMessage")}
      isLoading={isLoading}
    />
  );
}
