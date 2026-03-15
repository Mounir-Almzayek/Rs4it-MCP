"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Wrench, Sparkles, Puzzle, Shield, RefreshCw } from "lucide-react";

async function fetchRegistry() {
  const res = await fetch("/api/registry", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch registry");
  return res.json();
}

async function fetchRolesCount() {
  const res = await fetch("/api/roles");
  if (!res.ok) return { roles: [] };
  const data = await res.json();
  return { roles: data.roles ?? [] };
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["registry"],
    queryFn: fetchRegistry,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRolesCount,
  });
  const rolesCount = rolesData?.roles?.length ?? 0;

  const toolsCount = Array.isArray(data?.tools) ? data.tools.length : 0;
  const skillsCount = Array.isArray(data?.skills) ? data.skills.length : 0;
  const pluginsCount = Array.isArray(data?.plugins) ? data.plugins.length : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex gap-2">
          <Link href="/registry" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Registry Preview
          </Link>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <Link href="/tools" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              Manage tools →
            </Link>
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
            <Link href="/skills" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              Manage skills →
            </Link>
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
            <Link href="/plugins" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              Manage plugins →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rolesCount}</div>
            <p className="text-xs text-muted-foreground">
              Role definitions (visibility)
            </p>
            <Link href="/roles" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              Manage roles →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/tools?create=1" className={buttonVariants()}>
            Create Tool
          </Link>
          <Link href="/skills?create=1" className={buttonVariants()}>
            Create Skill
          </Link>
          <Link href="/plugins?create=1" className={buttonVariants()}>
            Add Plugin
          </Link>
          <Link href="/roles" className={buttonVariants({ variant: "outline" })}>
            Roles
          </Link>
          <Link href="/permissions" className={buttonVariants({ variant: "outline" })}>
            Permissions Matrix
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
