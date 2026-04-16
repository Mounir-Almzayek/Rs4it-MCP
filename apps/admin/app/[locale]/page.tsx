"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Wrench,
  Puzzle,
  FileText,
  Shield,
  RefreshCw,
  BookOpen,
  Zap,
  MessageSquare,
  Users,
  Bot,
  TerminalSquare,
} from "lucide-react";

async function fetchRegistry() {
  const res = await fetch("/api/registry", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch registry");
  return res.json();
}

type PluginStatusPlugin = {
  id: string;
  status: string;
  tools?: unknown[];
  resources?: unknown[];
  prompts?: unknown[];
};

async function fetchPluginStatus(): Promise<{ plugins: PluginStatusPlugin[] }> {
  const res = await fetch("/api/plugin-status", { cache: "no-store" });
  if (!res.ok) return { plugins: [] };
  const data = await res.json();
  return { plugins: Array.isArray(data?.plugins) ? (data.plugins as PluginStatusPlugin[]) : [] };
}

async function fetchMcpUsers() {
  const res = await fetch("/api/mcp-users");
  if (!res.ok) return [];
  return res.json();
}

async function fetchRolesCount() {
  const res = await fetch("/api/roles");
  if (!res.ok) return { roles: [] };
  const data = await res.json();
  return { roles: data.roles ?? [] };
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tn = useTranslations("nav");
  const tt = useTranslations("tools");
  const ts = useTranslations("skills");
  const tp = useTranslations("plugins");
  const tr = useTranslations("resources");
  const tru = useTranslations("rules");
  const tpr = useTranslations("prompts");
  const tsa = useTranslations("subagents");
  const tcmd = useTranslations("commands");
  const tcom = useTranslations("common");
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
  const { data: mcpUsersData } = useQuery({
    queryKey: ["mcp-users"],
    queryFn: fetchMcpUsers,
  });
  const { data: pluginStatus } = useQuery({
    queryKey: ["plugin-status"],
    queryFn: fetchPluginStatus,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const rolesCount = rolesData?.roles?.length ?? 0;
  const usersCount = Array.isArray(mcpUsersData) ? mcpUsersData.length : 0;

  const registryToolsCount = Array.isArray(data?.tools) ? data.tools.length : 0;
  const pluginToolsCount = (pluginStatus?.plugins ?? [])
    .filter((p) => p.status === "connected" && Array.isArray(p.tools))
    .reduce((sum, p) => sum + (p.tools?.length ?? 0), 0);
  const toolsCount = registryToolsCount + pluginToolsCount;

  const pluginsCount = Array.isArray(data?.plugins) ? data.plugins.length : 0;

  const registryResourcesCount = Array.isArray(data?.resources) ? data.resources.length : 0;
  const pluginResourcesCount = (pluginStatus?.plugins ?? [])
    .filter((p) => p.status === "connected" && Array.isArray(p.resources))
    .reduce((sum, p) => sum + (p.resources?.length ?? 0), 0);
  const resourcesCount = registryResourcesCount + pluginResourcesCount;

  const rulesCount = Array.isArray(data?.rules) ? data.rules.length : 0;
  const skillsCount = Array.isArray(data?.skills) ? data.skills.length : 0;
  const subagentsCount = Array.isArray(data?.subagents) ? data.subagents.length : 0;
  const commandsCount = Array.isArray(data?.commands) ? data.commands.length : 0;

  const registryPromptsCount = Array.isArray(data?.prompts) ? data.prompts.length : 0;
  const pluginPromptsCount = (pluginStatus?.plugins ?? [])
    .filter((p) => p.status === "connected" && Array.isArray(p.prompts))
    .reduce((sum, p) => sum + (p.prompts?.length ?? 0), 0);
  const promptsCount = registryPromptsCount + pluginPromptsCount;

  return (
    <div className="page-enter space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-tight">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["plugin-status"] });
            }}
            disabled={isLoading}
          >
            <RefreshCw className="me-2 h-4 w-4" />
            {tcom("refresh")}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{String(error)}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tn("tools")}</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-secondary" /> : toolsCount}</div>
            <p className="text-xs text-muted-foreground">{t("cardToolsSub")}</p>
            <Link href="/tools" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              {t("manageArrow", { name: tn("tools") })}
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tn("plugins")}</CardTitle>
            <Puzzle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-secondary" /> : pluginsCount}</div>
            <p className="text-xs text-muted-foreground">{t("cardPluginsSub")}</p>
            <Link href="/plugins" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              {t("manageArrow", { name: tn("plugins") })}
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tn("resources")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-secondary" /> : resourcesCount}</div>
            <p className="text-xs text-muted-foreground">{t("cardResourcesSub")}</p>
            <Link href="/resources" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              {t("manageArrow", { name: tn("resources") })}
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tn("rules")}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-secondary" /> : rulesCount}</div>
            <p className="text-xs text-muted-foreground">{t("cardRulesSub")}</p>
            <Link href="/rules" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              {t("manageArrow", { name: tn("rules") })}
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tn("skills")}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-secondary" /> : skillsCount}</div>
            <p className="text-xs text-muted-foreground">{t("cardSkillsSub")}</p>
            <Link href="/skills" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              {t("manageArrow", { name: tn("skills") })}
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tn("prompts")}</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-secondary" /> : promptsCount}</div>
            <p className="text-xs text-muted-foreground">{t("cardPromptsSub")}</p>
            <Link href="/prompts" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              {t("manageArrow", { name: tn("prompts") })}
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tn("subagents")}</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-secondary" /> : subagentsCount}</div>
            <p className="text-xs text-muted-foreground">{t("cardSubagentsSub")}</p>
            <Link href="/subagents" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              {t("manageArrow", { name: tn("subagents") })}
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tn("commands")}</CardTitle>
            <TerminalSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-secondary" /> : commandsCount}</div>
            <p className="text-xs text-muted-foreground">{t("cardCommandsSub")}</p>
            <Link href="/commands" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              {t("manageArrow", { name: tn("commands") })}
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tn("mcpUsers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-secondary" /> : usersCount}</div>
            <p className="text-xs text-muted-foreground">{t("cardMcpUsersSub")}</p>
            <Link href="/mcp-users" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              {t("manageArrow", { name: tn("mcpUsers") })}
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tn("roles")}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rolesCount}</div>
            <p className="text-xs text-muted-foreground">{t("cardRolesSub")}</p>
            <Link href="/roles" className={cn(buttonVariants({ variant: "link" }), "mt-2 h-auto p-0")}>
              {t("manageArrow", { name: tn("roles") })}
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>{t("quickActions")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/tools?create=1" className={buttonVariants()}>
            {tt("create")}
          </Link>
          <Link href="/plugins?create=1" className={buttonVariants()}>
            {tp("create")}
          </Link>
          <Link href="/resources?create=1" className={buttonVariants()}>
            {tr("create")}
          </Link>
          <Link href="/rules?create=1" className={buttonVariants()}>
            {tru("create")}
          </Link>
          <Link href="/skills?create=1" className={buttonVariants()}>
            {ts("create")}
          </Link>
          <Link href="/prompts?create=1" className={buttonVariants()}>
            {tpr("create")}
          </Link>
          <Link href="/subagents?create=1" className={buttonVariants()}>
            {tsa("create")}
          </Link>
          <Link href="/commands?create=1" className={buttonVariants()}>
            {tcmd("create")}
          </Link>
          <Link href="/roles" className={buttonVariants({ variant: "outline" })}>
            {tn("roles")}
          </Link>
          <Link href="/permissions" className={buttonVariants({ variant: "outline" })}>
            {tn("permissions")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
