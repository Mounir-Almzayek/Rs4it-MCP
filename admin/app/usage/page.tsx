"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, RefreshCw, Wrench, Sparkles, Puzzle } from "lucide-react";
import { entityType, type UsageStats } from "@/lib/usage-types";

async function fetchUsage(): Promise<UsageStats> {
  const res = await fetch("/api/usage");
  if (!res.ok) throw new Error("Failed to fetch usage");
  return res.json();
}

function TypeBadge({ name }: { name: string }) {
  const type = entityType(name);
  const Icon = type === "skill" ? Sparkles : type === "plugin" ? Puzzle : Wrench;
  const label = type === "skill" ? "Skill" : type === "plugin" ? "Plugin" : "Tool";
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export default function UsagePage() {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ["usage"],
    queryFn: fetchUsage,
    refetchInterval: 30_000,
  });

  const entities = stats?.byEntity
    ? Object.entries(stats.byEntity).sort((a, b) => (b[1].total ?? 0) - (a[1].total ?? 0))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Usage</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Invocations by entity
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How many times each tool, skill, or plugin was called, and by whom (
            <code className="rounded bg-muted px-1">X-MCP-User-Name</code> or anonymous).
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-destructive text-sm">Error: {String(error)}</p>
          )}
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : entities.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <BarChart3 className="mx-auto h-10 w-10 opacity-50" />
              <p className="mt-2">No invocations recorded yet.</p>
              <p className="mt-1 text-sm">
                Usage is tracked when the Hub runs over HTTP and clients call tools/skills/plugins.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium">Type</th>
                    <th className="p-3 text-right font-medium">Total</th>
                    <th className="p-3 text-left font-medium">By user</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map(([name, ent]) => (
                    <tr key={name} className="border-b last:border-0">
                      <td className="p-3 font-mono">{name}</td>
                      <td className="p-3">
                        <TypeBadge name={name} />
                      </td>
                      <td className="p-3 text-right tabular-nums font-medium">
                        {ent.total}
                      </td>
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
            <CardTitle>Recent invocations</CardTitle>
            <p className="text-sm text-muted-foreground">Last 100 calls (tool, user, time).</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Tool</th>
                    <th className="p-3 text-left font-medium">User</th>
                    <th className="p-3 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((e, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3 font-mono">{e.toolName}</td>
                      <td className="p-3 text-muted-foreground">{e.userName ?? "anonymous"}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(e.timestamp).toLocaleString()}
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
