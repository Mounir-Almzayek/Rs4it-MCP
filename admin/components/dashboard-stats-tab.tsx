"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  Zap,
  Users,
  Layers,
} from "lucide-react";
import { entityType, type UsageStats } from "@/lib/usage-types";
import Link from "next/link";

async function fetchUsage(): Promise<UsageStats> {
  const res = await fetch("/api/usage?recentLimit=500");
  if (!res.ok) throw new Error("Failed to fetch usage");
  return res.json();
}

const TYPE_COLORS = {
  tool: "hsl(var(--chart-1))",
  skill: "hsl(var(--chart-2))",
  plugin: "hsl(var(--chart-3))",
} as const;

function useChartData(stats: UsageStats | undefined, range: "7d" | "30d" | "all") {
  return useMemo(() => {
    if (!stats) return null;
    const { byEntity, recent } = stats;
    const now = Date.now();
    const cutOff7 = now - 7 * 24 * 60 * 60 * 1000;
    const cutOff30 = now - 30 * 24 * 60 * 60 * 1000;
    const filteredRecent =
      range === "7d"
        ? recent.filter((e) => new Date(e.timestamp).getTime() >= cutOff7)
        : range === "30d"
          ? recent.filter((e) => new Date(e.timestamp).getTime() >= cutOff30)
          : recent;
    const byDay: Record<string, number> = {};
    filteredRecent.forEach((e) => {
      const day = e.timestamp.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    });
    const timeSeries = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        invocations: count,
        full: new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      }));
    const entities = Object.entries(byEntity)
      .sort((a, b) => (b[1].total ?? 0) - (a[1].total ?? 0))
      .slice(0, 12)
      .map(([name, ent]) => ({
        name: name.length > 20 ? name.slice(0, 18) + "…" : name,
        fullName: name,
        total: ent.total,
      }));
    const byType = { tool: 0, skill: 0, plugin: 0 };
    Object.entries(byEntity).forEach(([name, ent]) => {
      byType[entityType(name)] += ent.total;
    });
    const typePie = [
      { name: "Tools", value: byType.tool, type: "tool" as const },
      { name: "Skills", value: byType.skill, type: "skill" as const },
      { name: "Plugins", value: byType.plugin, type: "plugin" as const },
    ].filter((d) => d.value > 0);
    const userTotals: Record<string, number> = {};
    Object.values(byEntity).forEach((ent) => {
      Object.entries(ent.byUser ?? {}).forEach(([u, c]) => {
        userTotals[u] = (userTotals[u] ?? 0) + c;
      });
    });
    const byUser = Object.entries(userTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([user, count]) => ({ user: user === "anonymous" ? "Anonymous" : user, count }));
    return {
      timeSeries,
      entities,
      typePie,
      byUser,
      totalInvocations: Object.values(byEntity).reduce((s, e) => s + (e.total ?? 0), 0),
      uniqueEntities: Object.keys(byEntity).length,
      uniqueUsers: Object.keys(userTotals).length,
      byType,
    };
  }, [stats, range]);
}

export function DashboardStatsTab() {
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ["usage", range],
    queryFn: fetchUsage,
    refetchInterval: 60_000,
  });
  const chartData = useChartData(stats, range);
  const hasData = chartData && (chartData.totalInvocations > 0 || (stats?.recent?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">MCP usage statistics and charts.</p>
        <div className="flex items-center gap-2">
          {(["7d", "30d", "all"] as const).map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(r)}
            >
              {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "All"}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive text-sm">
          {String(error)}
        </div>
      )}

      {!hasData && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-3 text-lg font-semibold">No usage data yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Invocations are recorded when the Hub runs over HTTP and clients call tools, skills, or plugins.
            </p>
            <Link href="/usage" className="mt-4">
              <Button variant="outline" size="sm">View Usage table</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {hasData && chartData && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/15 dark:to-emerald-600/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total invocations</CardTitle>
                <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{chartData.totalInvocations.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">All tools, skills, plugins</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-violet-500/10 to-violet-600/5 dark:from-violet-500/15 dark:to-violet-600/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unique entities</CardTitle>
                <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{chartData.uniqueEntities}</div>
                <p className="text-xs text-muted-foreground">Tools, skills, plugins used</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-500/15 dark:to-amber-600/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unique users</CardTitle>
                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{chartData.uniqueUsers}</div>
                <p className="text-xs text-muted-foreground">Distinct MCP clients</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 dark:from-cyan-500/15 dark:to-cyan-600/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Most used type</CardTitle>
                <TrendingUp className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {chartData.byType.tool >= chartData.byType.skill && chartData.byType.tool >= chartData.byType.plugin
                    ? "Tools"
                    : chartData.byType.skill >= chartData.byType.plugin
                      ? "Skills"
                      : "Plugins"}
                </div>
                <p className="text-xs text-muted-foreground">By invocation count</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Invocations over time
                </CardTitle>
                <p className="text-sm text-muted-foreground">Daily activity from recent events</p>
              </CardHeader>
              <CardContent>
                {chartData.timeSeries.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed text-muted-foreground text-sm">
                    No time series data in range
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData.timeSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillInvocations" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="full" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} width={32} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                        formatter={(value: number) => [value, "Invocations"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="invocations"
                        name="Invocations"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        fill="url(#fillInvocations)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-violet-600" />
                  By type
                </CardTitle>
                <p className="text-sm text-muted-foreground">Tools vs skills vs plugins</p>
              </CardHeader>
              <CardContent>
                {chartData.typePie.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed text-muted-foreground text-sm">
                    No data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={chartData.typePie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData.typePie.map((entry) => (
                          <Cell key={entry.type} fill={TYPE_COLORS[entry.type]} stroke="hsl(var(--background))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                        formatter={(value: number) => [value.toLocaleString(), "Invocations"]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-amber-600" />
                  Top entities
                </CardTitle>
                <p className="text-sm text-muted-foreground">Most invoked (top 12)</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={chartData.entities}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} width={40} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                      formatter={(value: number) => [value, "Invocations"]}
                      labelFormatter={(_, payload) => payload[0]?.payload?.fullName ?? ""}
                    />
                    <Bar dataKey="total" name="Invocations" radius={[0, 4, 4, 0]} fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-cyan-600" />
                  By user
                </CardTitle>
                <p className="text-sm text-muted-foreground">Invocations per user (top 10)</p>
              </CardHeader>
              <CardContent>
                {chartData.byUser.length === 0 ? (
                  <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed text-muted-foreground text-sm">
                    No user data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData.byUser} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="user" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={40} />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                        formatter={(value: number) => [value, "Invocations"]}
                      />
                      <Bar dataKey="count" name="Invocations" radius={[4, 4, 0, 0]} fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/usage">
              <Badge variant="secondary" className="cursor-pointer gap-1 px-3 py-1.5 hover:bg-muted">
                <BarChart3 className="h-3.5 w-3.5" />
                Usage table
              </Badge>
            </Link>
            <Link href="/mcp-users">
              <Badge variant="secondary" className="cursor-pointer gap-1 px-3 py-1.5 hover:bg-muted">
                <Users className="h-3.5 w-3.5" />
                MCP Users
              </Badge>
            </Link>
          </div>
        </>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
