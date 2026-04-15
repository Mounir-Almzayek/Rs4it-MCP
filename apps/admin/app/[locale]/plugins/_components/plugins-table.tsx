"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Pencil,
  Trash2,
  Plug,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DynamicPluginEntry } from "@/lib/dynamic-registry-types";
import type { RoleDefinition } from "@/lib/roles";
import type { PluginConnectionStatus } from "../_hooks/use-plugins";

interface PluginsTableProps {
  data: DynamicPluginEntry[];
  roles: RoleDefinition[];
  connectionById: Map<
    string,
    { status: string; toolsCount?: number; error?: string }
  >;
  pluginStatus?: {
    updatedAt: string | null;
    plugins: PluginConnectionStatus[];
  };
  isLoading: boolean;
  onEdit: (plugin: DynamicPluginEntry) => void;
  onDelete: (id: string) => void;
}

function resolvedCommand(p: DynamicPluginEntry): string {
  return [p.command, ...(p.args ?? [])].join(" ");
}

export function PluginsTable({
  data,
  roles,
  connectionById,
  pluginStatus,
  isLoading,
  onEdit,
  onDelete,
}: PluginsTableProps) {
  const t = useTranslations("plugins");
  const tc = useTranslations("common");

  const columns: Column<DynamicPluginEntry & Record<string, unknown>>[] =
    useMemo(
      () => [
        {
          key: "id",
          header: t("id"),
          sortable: true,
          className: "min-w-[120px]",
          render: (row) => (
            <span className="font-mono text-sm">{row.id}</span>
          ),
        },
        {
          key: "name",
          header: tc("name"),
          sortable: true,
          className: "min-w-[140px]",
          render: (row) => <span className="text-sm">{row.name}</span>,
        },
        {
          key: "command",
          header: t("resolvedCommand"),
          sortable: true,
          className: "min-w-[200px] max-w-[300px]",
          render: (row) => (
            <span className="font-mono text-xs text-muted-foreground">
              {resolvedCommand(row)}
            </span>
          ),
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
          key: "source",
          header: tc("source"),
          sortable: true,
          render: (row) => (
            <Badge
              variant={row.source === "mcp" ? "secondary" : "outline"}
            >
              {row.source === "mcp" ? tc("mcp") : tc("admin")}
            </Badge>
          ),
        },
        {
          key: "connection",
          header: t("connection"),
          render: (row) => {
            const conn = connectionById.get(row.id);
            if (conn === undefined) {
              return (
                <span className="text-muted-foreground text-xs">
                  &mdash;
                </span>
              );
            }
            if (conn.status === "connected") {
              return (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("connected")} ({conn.toolsCount ?? 0})
                </Badge>
              );
            }
            return (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3.5 w-3.5" />
                {t("failed")}
              </Badge>
            );
          },
        },
        {
          key: "enabled",
          header: tc("status"),
          sortable: true,
          sortValue: (row) => (row.enabled ? 1 : 0),
          render: (row) => <StatusBadge enabled={row.enabled} />,
        },
        {
          key: "actions",
          header: tc("actions"),
          className: "text-end",
          render: (row) => (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(row)}
                aria-label={tc("edit")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(row.id)}
                aria-label={tc("delete")}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ),
        },
      ],
      [tc, t, roles, connectionById, onEdit, onDelete],
    );

  const failedPlugins = (pluginStatus?.plugins ?? []).filter(
    (p) =>
      p.status === "failed" &&
      p.error &&
      data.some((r) => r.id === p.id),
  );

  return (
    <>
      <DataTable
        data={data as (DynamicPluginEntry & Record<string, unknown>)[]}
        columns={columns}
        keyFn={(row) => String(row.id)}
        searchFields={["id", "name", "command"]}
        emptyIcon={Plug}
        emptyMessage={t("emptyMessage")}
        isLoading={isLoading}
      />

      {failedPlugins.length > 0 && (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5">
          <h4 className="flex items-center gap-2 p-3 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            {t("connectionErrors")}
          </h4>
          <ul className="list-none space-y-4 p-3 pt-0">
            {failedPlugins.map((p) => (
              <li
                key={p.id}
                className="rounded border border-destructive/20 bg-background p-3"
              >
                <p className="mb-1 font-medium font-mono text-sm">
                  {p.id}
                </p>
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-xs text-destructive">
                  {p.error}
                </pre>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
