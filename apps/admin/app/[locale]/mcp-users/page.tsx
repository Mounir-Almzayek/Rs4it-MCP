"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableCellText } from "@/components/table-cell-text";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw } from "lucide-react";
import type { McpUserRecord } from "@/lib/mcp-users";
import { formatRelativeLastUsed } from "@/lib/format-relative-last-used";
import { cn } from "@/lib/utils";

async function fetchMcpUsers(): Promise<McpUserRecord[]> {
  const res = await fetch("/api/mcp-users");
  if (!res.ok) throw new Error("Failed to fetch MCP users");
  return res.json();
}

export default function McpUsersPage() {
  const t = useTranslations("mcpUsers");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ["mcp-users"],
    queryFn: fetchMcpUsers,
    refetchInterval: 60_000,
  });

  function formatSeen(iso: string | null | undefined): string {
    if (!iso) return "—";
    const loc = locale === "ar" ? "ar" : "en-US";
    return new Date(iso).toLocaleString(loc);
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight">{t("title")}</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn("me-2 h-4 w-4", isLoading && "animate-spin")} />
          {tc("refresh")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("connectionsTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("connectionsDesc")}
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive">
              {tc("errorWithMessage", { message: String(error) })}
            </p>
          )}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{tc("loading")}</p>
          ) : !users?.length ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <Users className="mx-auto h-10 w-10 opacity-50" />
              <p className="mt-2">{t("noUsers")}</p>
              <p className="mt-1 text-sm">{t("emptyDetail")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">{t("userName")}</th>
                    <th className="p-3 text-start font-medium">{t("lastUsed")}</th>
                    <th className="p-3 text-start font-medium">{t("firstSeen")}</th>
                    <th className="p-3 text-end font-medium">{t("requests")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.name} className="border-b last:border-0">
                      <TableCellText
                        text={u.name}
                        label={t("userName")}
                        maxWidthClass="max-w-[200px]"
                        innerClassName="font-medium"
                      />
                      <td className="p-3 text-muted-foreground">
                        {formatRelativeLastUsed(u.last_used_at, locale, t)}
                      </td>
                      <td className="p-3 text-muted-foreground">{formatSeen(u.first_seen_at)}</td>
                      <td className="p-3 text-end tabular-nums">{u.request_count ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
