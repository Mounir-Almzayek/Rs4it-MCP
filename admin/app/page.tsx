"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Wrench, Sparkles, Puzzle, MessageSquare, FileText, Shield, RefreshCw, BookOpen } from "lucide-react";

async function fetchRegistry() {
  const res = await fetch("/api/registry", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch registry");
  return res.json();
}

type PluginStatusPlugin = {
  id: string;
  status: string;
  tools?: unknown[];
  skills?: unknown[];
  prompts?: unknown[];
  resources?: unknown[];
};

async function fetchPluginStatus(): Promise<{ plugins: PluginStatusPlugin[] }> {
  const res = await fetch("/api/plugin-status", { cache: "no-store" });
  if (!res.ok) return { plugins: [] };
  const data = await res.json();
  return { plugins: Array.isArray(data?.plugins) ? (data.plugins as PluginStatusPlugin[]) : [] };
}

async function fetchRolesCount() {
  const res = await fetch("/api/roles");
  if (!res.ok) return { roles: [] };
  const data = await res.json();
  return { roles: data.roles ?? [] };
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
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
  const { data: pluginStatus } = useQuery({
    queryKey: ["plugin-status"],
    queryFn: fetchPluginStatus,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const rolesCount = rolesData?.roles?.length ?? 0;

  const registryToolsCount = Array.isArray(data?.tools) ? data.tools.length : 0;
  const pluginToolsCount = (pluginStatus?.plugins ?? [])
    .filter((p) => p.status === "connected" && Array.isArray(p.tools))
    .reduce((sum, p) => sum + (p.tools?.length ?? 0), 0);
  const toolsCount = registryToolsCount + pluginToolsCount;

  const registrySkillsCount = Array.isArray(data?.skills) ? data.skills.length : 0;
  const pluginSkillsCount = (pluginStatus?.plugins ?? [])
    .filter((p) => p.status === "connected" && Array.isArray(p.skills))
    .reduce((sum, p) => sum + (p.skills?.length ?? 0), 0);
  const skillsCount = registrySkillsCount + pluginSkillsCount;

  const pluginsCount = Array.isArray(data?.plugins) ? data.plugins.length : 0;

  const registryPromptsCount = Array.isArray(data?.prompts) ? data.prompts.length : 0;
  const pluginPromptsCount = (pluginStatus?.plugins ?? [])
    .filter((p) => p.status === "connected" && Array.isArray(p.prompts))
    .reduce((sum, p) => sum + (p.prompts?.length ?? 0), 0);
  const promptsCount = registryPromptsCount + pluginPromptsCount;

  const registryResourcesCount = Array.isArray(data?.resources) ? data.resources.length : 0;
  const pluginResourcesCount = (pluginStatus?.plugins ?? [])
    .filter((p) => p.status === "connected" && Array.isArray(p.resources))
    .reduce((sum, p) => sum + (p.resources?.length ?? 0), 0);
  const resourcesCount = registryResourcesCount + pluginResourcesCount;

  const rulesCount = Array.isArray(data?.rules) ? data.rules.length : 0;

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
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["plugin-status"] });
            }}
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              Registry + MCP plugin tools
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
              Registry + MCP plugin skills
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
            <CardTitle className="text-sm font-medium">Prompts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "—" : promptsCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Registry + MCP plugin prompts
            </p>
            <Link href="/prompts" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              Manage prompts →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resources</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "—" : resourcesCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Registry + MCP plugin resources
            </p>
            <Link href="/resources" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              Manage resources →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rules</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "—" : rulesCount}</div>
            <p className="text-xs text-muted-foreground">Markdown guidance (Cursor-like)</p>
            <Link href="/rules" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              Manage rules →
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
          <Link href="/prompts?create=1" className={buttonVariants()}>
            Create Prompt
          </Link>
          <Link href="/resources?create=1" className={buttonVariants()}>
            Create Resource
          </Link>
          <Link href="/rules?create=1" className={buttonVariants()}>
            Create Rule
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
