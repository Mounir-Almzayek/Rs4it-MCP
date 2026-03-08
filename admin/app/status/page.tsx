"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

async function fetchRegistry() {
  const res = await fetch("/api/registry");
  if (!res.ok) throw new Error("Failed to fetch registry");
  return res.json();
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
  });
  const reloadMutation = useMutation({
    mutationFn: triggerReload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry"] });
    },
  });

  const toolsCount = data?.tools?.length ?? 0;
  const skillsCount = data?.skills?.length ?? 0;
  const pluginsCount = data?.plugins?.length ?? 0;

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
          </ul>
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
