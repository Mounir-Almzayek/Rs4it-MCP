"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, Plug } from "lucide-react";

async function fetchRegistry() {
  const res = await fetch("/api/registry", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch registry");
  return res.json();
}

async function fetchPluginStatus() {
  const res = await fetch("/api/plugin-status", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch plugin status");
  return res.json() as Promise<{ updatedAt: string | null; plugins: Array<{ id: string; name: string; status: "connected" | "failed"; toolsCount?: number; error?: string }> }>;
}

async function triggerReload() {
  const res = await fetch("/api/reload", { method: "POST" });
  if (!res.ok) throw new Error("Reload request failed");
  return res.json();
}

export default function StatusPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["registry"],
    queryFn: fetchRegistry,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const { data: pluginStatus, isLoading: pluginStatusLoading } = useQuery({
    queryKey: ["plugin-status"],
    queryFn: fetchPluginStatus,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const reloadMutation = useMutation({
    mutationFn: triggerReload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry"] });
      queryClient.invalidateQueries({ queryKey: ["plugin-status"] });
    },
  });

  const toolsCount = Array.isArray(data?.tools) ? data.tools.length : 0;
  const skillsCount = Array.isArray(data?.skills) ? data.skills.length : 0;
  const pluginsCount = Array.isArray(data?.plugins) ? data.plugins.length : 0;
  const promptsCount = Array.isArray(data?.prompts) ? data.prompts.length : 0;
  const resourcesCount = Array.isArray(data?.resources) ? data.resources.length : 0;
  const connections = pluginStatus?.plugins ?? [];
  const connectedCount = connections.filter((p) => p.status === "connected").length;
  const failedCount = connections.filter((p) => p.status === "failed").length;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold tracking-tight">System Status</h2>

      <Card>
        <CardHeader>
          <CardTitle>Registry summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Current counts from the dynamic registry file. The Hub reads this file on each new session.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {error && (
            <p className="text-destructive">Error: {String(error)}</p>
          )}
          <ul className="list-inside list-disc text-sm">
            <li>Tools: {isLoading ? "…" : toolsCount}</li>
            <li>Skills: {isLoading ? "…" : skillsCount}</li>
            <li>Plugins: {isLoading ? "…" : pluginsCount}</li>
            <li>Prompts: {isLoading ? "…" : promptsCount}</li>
            <li>Resources: {isLoading ? "…" : resourcesCount}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            MCP plugin connections
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Connection status of each MCP plugin at Hub startup. Updated when the Hub starts; restart the Hub to refresh.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {pluginStatusLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !pluginStatus?.updatedAt && connections.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No status file yet. Start the Hub so it can connect to plugins and write status to <code className="rounded bg-muted px-1">config/mcp_plugin_status.json</code>.
            </p>
          ) : (
            <>
              {pluginStatus?.updatedAt && (
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(pluginStatus.updatedAt).toLocaleString()}
                  {connectedCount + failedCount > 0 && (
                    <span className="ml-2">
                      — {connectedCount} connected, {failedCount} failed
                    </span>
                  )}
                </p>
              )}
              {connections.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium">Plugin</th>
                        <th className="p-2 text-left font-medium">Name</th>
                        <th className="p-2 text-left font-medium">Status</th>
                        <th className="p-2 text-left font-medium">Tools</th>
                        <th className="p-2 text-left font-medium">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {connections.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="p-2 font-mono">{p.id}</td>
                          <td className="p-2">{p.name}</td>
                          <td className="p-2">
                            {p.status === "connected" ? (
                              <Badge variant="success" className="gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Connected
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3.5 w-3.5" />
                                Failed
                              </Badge>
                            )}
                          </td>
                          <td className="p-2 tabular-nums">{p.toolsCount ?? "—"}</td>
                          <td className="p-2 max-w-[280px] truncate text-muted-foreground" title={p.error}>
                            {p.error ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration reload</CardTitle>
          <p className="text-sm text-muted-foreground">
            The Hub does not keep a long-lived in-memory copy of the registry; it reads the file when creating each new session. Changes you make in the admin panel are written to the registry file immediately. New Hub sessions will see the updated config.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => reloadMutation.mutate()}
            disabled={reloadMutation.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Trigger reload (invalidate cache)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
