"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableCellText } from "@/components/table-cell-text";
import type { CapabilitiesSnapshot, SnapshotTool } from "@/lib/capabilities";
import { Activity, Wrench, Sparkles, FileEdit, Puzzle } from "lucide-react";

async function fetchRegistry() {
  const res = await fetch("/api/registry", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch registry");
  return res.json();
}

async function fetchCapabilities(): Promise<CapabilitiesSnapshot> {
  const res = await fetch("/api/capabilities", { cache: "no-store" });
  if (!res.ok) return { updatedAt: "", tools: [], prompts: [], resources: [] };
  return res.json();
}

function SourceBadge({ tool }: { tool: SnapshotTool }) {
  if (tool.source === "built-in")
    return (
      <Badge variant="secondary" className="gap-1">
        <Wrench className="h-3 w-3" /> Built-in
      </Badge>
    );
  if (tool.source === "skill")
    return (
      <Badge variant="secondary" className="gap-1">
        <Sparkles className="h-3 w-3" /> Skill
      </Badge>
    );
  if (tool.source === "dynamic")
    return (
      <Badge variant="outline" className="gap-1">
        <FileEdit className="h-3 w-3" /> Manual
      </Badge>
    );
  return (
    <Badge variant="default" className="gap-1">
      <Puzzle className="h-3 w-3" /> MCP: {tool.pluginId ?? "—"}
    </Badge>
  );
}

export default function RegistryPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["registry"],
    queryFn: fetchRegistry,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const { data: capabilities, isLoading: capabilitiesLoading } = useQuery({
    queryKey: ["capabilities"],
    queryFn: fetchCapabilities,
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        {String(error)}
      </div>
    );
  }

  const tools = Array.isArray(data?.tools) ? data.tools : [];
  const skills = Array.isArray(data?.skills) ? data.skills : [];
  const plugins = Array.isArray(data?.plugins) ? data.plugins : [];
  const prompts = Array.isArray(data?.prompts) ? data.prompts : [];
  const resources = Array.isArray(data?.resources) ? data.resources : [];
  const liveTools = capabilities?.tools ?? [];
  const hasLive = liveTools.length > 0;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold tracking-tight">Registry Preview</h2>
      <p className="text-muted-foreground">
        This is what the MCP Hub exposes to AI clients (tools list). Built-in tools and skills are merged with this dynamic registry.
      </p>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Live capabilities (from last MCP connection)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            All tools currently exposed by the Hub, with source: Built-in, Skill, Manual (registry), or from an embedded MCP (plugin). Updated every time a client connects.
          </p>
          {capabilities?.updatedAt && (
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(capabilities.updatedAt).toLocaleString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {capabilitiesLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !hasLive ? (
            <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
              No snapshot yet. Connect a client (e.g. Cursor) to the Hub once to populate this list.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium">Description</th>
                    <th className="p-3 text-left font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {liveTools.map((t) => (
                    <tr key={t.name} className="border-b last:border-0">
                      <TableCellText text={t.name} label="Name" maxWidthClass="max-w-[220px]" innerClassName="font-mono" />
                      <TableCellText text={t.description} label="Description" maxWidthClass="max-w-[280px]" />
                      <td className="p-3">
                        <SourceBadge tool={t} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tools exposed to AI</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dynamic tools from registry (name, description, handlerRef).
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : tools.length === 0 ? (
            <p className="text-muted-foreground">No dynamic tools.</p>
          ) : (
            <ul className="space-y-2 font-mono text-sm">
              {tools.filter((t: { enabled?: boolean }) => t.enabled !== false).map((t: { name: string; description?: string }) => (
                <li key={t.name} className="rounded border px-3 py-2">
                  <span className="font-semibold">{t.name}</span>
                  {t.description && (
                    <span className="ml-2 text-muted-foreground">— {t.description}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills exposed to AI</CardTitle>
          <p className="text-sm text-muted-foreground">
            Exposed as skill:&lt;name&gt; tools.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : skills.length === 0 ? (
            <p className="text-muted-foreground">No dynamic skills.</p>
          ) : (
            <ul className="space-y-2 font-mono text-sm">
              {skills.filter((s: { enabled?: boolean }) => s.enabled !== false).map((s: { name: string; description?: string }) => (
                <li key={s.name} className="rounded border px-3 py-2">
                  <span className="font-semibold">skill:{s.name}</span>
                  {s.description && (
                    <span className="ml-2 text-muted-foreground">— {s.description}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>External MCP plugins loaded</CardTitle>
          <p className="text-sm text-muted-foreground">
            Plugins from static config + dynamic registry. Their tools appear as plugin:&lt;id&gt;:&lt;toolName&gt;.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : plugins.length === 0 ? (
            <p className="text-muted-foreground">No dynamic plugins in registry.</p>
          ) : (
            <ul className="space-y-2 font-mono text-sm">
              {plugins.filter((p: { enabled?: boolean }) => p.enabled !== false).map((p: { id: string; name?: string; command: string; args: string[] }) => (
                <li key={p.id} className="rounded border px-3 py-2">
                  <span className="font-semibold">plugin:{p.id}</span>
                  {p.name && (
                    <span className="ml-2 text-muted-foreground">— {p.name}</span>
                  )}
                  <span className="ml-2 block text-muted-foreground">
                    {p.command} {(p.args ?? []).join(" ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompts exposed to AI</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dynamic prompts from registry (prompts/list). Template-based with optional args.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : prompts.length === 0 ? (
            <p className="text-muted-foreground">No dynamic prompts in registry.</p>
          ) : (
            <ul className="space-y-2 font-mono text-sm">
              {prompts.filter((p: { enabled?: boolean }) => p.enabled !== false).map((p: { name: string; title?: string; description?: string }) => (
                <li key={p.name} className="rounded border px-3 py-2">
                  <span className="font-semibold">{p.name}</span>
                  {p.title && (
                    <span className="ml-2 text-muted-foreground">— {p.title}</span>
                  )}
                  {p.description && (
                    <span className="ml-2 block text-muted-foreground">{p.description}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resources exposed to AI</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dynamic resources from registry (resources/list). Static content at fixed URIs.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : resources.length === 0 ? (
            <p className="text-muted-foreground">No dynamic resources in registry.</p>
          ) : (
            <ul className="space-y-2 font-mono text-sm">
              {resources.filter((r: { enabled?: boolean }) => r.enabled !== false).map((r: { name: string; uri: string; description?: string }) => (
                <li key={r.name} className="rounded border px-3 py-2">
                  <span className="font-semibold">{r.name}</span>
                  <span className="ml-2 text-muted-foreground">{r.uri}</span>
                  {r.description && (
                    <span className="ml-2 block text-muted-foreground">{r.description}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
