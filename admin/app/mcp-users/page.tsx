"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw } from "lucide-react";
import type { McpUserRecord } from "@/lib/mcp-users";

async function fetchMcpUsers(): Promise<McpUserRecord[]> {
  const res = await fetch("/api/mcp-users");
  if (!res.ok) throw new Error("Failed to fetch MCP users");
  return res.json();
}

function formatLastUsed(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3600_000);
  const diffDays = Math.floor(diffMs / 86400_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} h ago`;
  if (diffDays < 7) return `${diffDays} d ago`;
  return date.toLocaleString();
}

export default function McpUsersPage() {
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ["mcp-users"],
    queryFn: fetchMcpUsers,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">MCP Users</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connections by user name</CardTitle>
          <p className="text-sm text-muted-foreground">
            Users who connected to the MCP Hub with a name (header <code className="rounded bg-muted px-1">X-MCP-User-Name</code> or{" "}
            <code className="rounded bg-muted px-1">params.userName</code>). Last used is updated on each request.
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-destructive text-sm">Error: {String(error)}</p>
          )}
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !users?.length ? (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              <Users className="mx-auto h-10 w-10 opacity-50" />
              <p className="mt-2">No MCP users recorded yet.</p>
              <p className="mt-1 text-sm">
                When clients connect with <code className="rounded bg-muted px-1">X-MCP-User-Name</code>, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">User name</th>
                    <th className="p-3 text-left font-medium">Last used</th>
                    <th className="p-3 text-left font-medium">First seen</th>
                    <th className="p-3 text-right font-medium">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.name} className="border-b last:border-0">
                      <td className="p-3 font-medium">{u.name}</td>
                      <td className="p-3 text-muted-foreground">
                        {formatLastUsed(u.last_used_at)}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {u.first_seen_at
                          ? new Date(u.first_seen_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {u.request_count ?? "—"}
                      </td>
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
