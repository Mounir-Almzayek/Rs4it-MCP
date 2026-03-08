"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Sparkles, Puzzle, RefreshCw } from "lucide-react";
import Link from "next/link";

async function fetchRegistry() {
  const res = await fetch("/api/registry");
  if (!res.ok) throw new Error("Failed to fetch registry");
  return res.json();
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["registry"],
    queryFn: fetchRegistry,
  });

  const toolsCount = data?.tools?.length ?? 0;
  const skillsCount = data?.skills?.length ?? 0;
  const pluginsCount = data?.plugins?.length ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/registry">Registry Preview</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {String(error)}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tools</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "—" : toolsCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Dynamic tools in registry
            </p>
            <Button variant="link" className="mt-2 h-auto p-0" asChild>
              <Link href="/tools">Manage tools →</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skills</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "—" : skillsCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Orchestration workflows
            </p>
            <Button variant="link" className="mt-2 h-auto p-0" asChild>
              <Link href="/skills">Manage skills →</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MCP Plugins</CardTitle>
            <Puzzle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "—" : pluginsCount}
            </div>
            <p className="text-xs text-muted-foreground">
              External MCP plugins
            </p>
            <Button variant="link" className="mt-2 h-auto p-0" asChild>
              <Link href="/plugins">Manage plugins →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/tools?create=1">Create Tool</Link>
          </Button>
          <Button asChild>
            <Link href="/skills?create=1">Create Skill</Link>
          </Button>
          <Button asChild>
            <Link href="/plugins?create=1">Add Plugin</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
