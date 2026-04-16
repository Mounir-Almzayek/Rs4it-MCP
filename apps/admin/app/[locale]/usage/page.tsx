"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCellText } from "@/components/table-cell-text";
import { BarChart3, RefreshCw, Wrench, Sparkles, Puzzle } from "lucide-react";
import { entityType, type UsageStats } from "@/lib/usage-types";
import { cn } from "@/lib/utils";

async function fetchUsage(): Promise<UsageStats> {
  const res = await fetch("/api/usage");
  if (!res.ok) throw new Error("Failed to fetch usage");
  return res.json();
}

function TypeBadge({ name, labels }: { name: string; labels: { tool: string; skill: string; plugin: string } }) {
  const type = entityType(name);
  const Icon = type === "skill" ? Sparkles : type === "plugin" ? Puzzle : Wrench;
  const label = type === "skill" ? labels.skill : type === "plugin" ? labels.plugin : labels.tool;
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export default function UsagePage() {
  const t = useTranslations("usage");
  const tc = useTranslations("common");
  const locale = useLocale();
  const loc = locale === "ar" ? "ar" : "en-US";
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ["usage"],
    queryFn: fetchUsage,
    refetchInterval: 30_000,
  });

  const entities = stats?.byEntity
    ? Object.entries(stats.byEntity).sort((a, b) => (b[1].total ?? 0) - (a[1].total ?? 0))
    : [];

  const typeLabels = { tool: t("tool"), skill: t("skill"), plugin: t("plugin") };

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
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t("byEntityTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("byEntityDesc")}</p>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive">
              {tc("errorWithMessage", { message: String(error) })}
            </p>
          )}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{tc("loading")}</p>
          ) : entities.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <BarChart3 className="mx-auto h-10 w-10 opacity-50" />
              <p className="mt-2">{t("emptyUsage")}</p>
              <p className="mt-1 text-sm">{t("emptyUsageHint")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">{tc("name")}</th>
                    <th className="p-3 text-start font-medium">{t("type")}</th>
                    <th className="p-3 text-end font-medium">{t("total")}</th>
                    <th className="p-3 text-start font-medium">{t("byUser")}</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map(([name, ent]) => (
                    <tr key={name} className="border-b last:border-0">
                      <TableCellText
                        text={name}
                        label={tc("name")}
                        maxWidthClass="max-w-[220px]"
                        innerClassName="font-mono"
                      />
                      <td className="p-3">
                        <TypeBadge name={name} labels={typeLabels} />
                      </td>
                      <td className="p-3 text-end tabular-nums font-medium">{ent.total}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(ent.byUser)
                            .sort((a, b) => b[1] - a[1])
                            .map(([user, count]) => (
                              <Badge key={user} variant="secondary" className="font-normal">
                                {user}: {count}
                              </Badge>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {stats?.recent && stats.recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("recentTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("recentDesc")}</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">{t("tool")}</th>
                    <th className="p-3 text-start font-medium">{tc("name")}</th>
                    <th className="p-3 text-start font-medium">{t("time")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((e, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <TableCellText
                        text={e.toolName}
                        label={t("tool")}
                        maxWidthClass="max-w-[220px]"
                        innerClassName="font-mono"
                      />
                      <TableCellText
                        text={e.userName ?? t("anonymous")}
                        label={t("userSingle")}
                        maxWidthClass="max-w-[140px]"
                        innerClassName="text-muted-foreground"
                      />
                      <td className="p-3 text-muted-foreground">
                        {new Date(e.timestamp).toLocaleString(loc)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
