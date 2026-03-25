"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function fetchRegistry() {
  const res = await fetch("/api/registry", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch registry");
  return res.json();
}

function snippet(s: string, max = 160): string {
  const t = s.trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function jsonSnippet(obj: unknown, max = 120): string {
  try {
    const j = JSON.stringify(obj);
    return snippet(j, max);
  } catch {
    return "";
  }
}

export default function RegistryPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["registry"],
    queryFn: fetchRegistry,
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
  const rules = Array.isArray(data?.rules) ? data.rules : [];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold tracking-tight">Registry Preview</h2>
      <p className="text-muted-foreground">
        This is what the MCP Hub exposes to AI clients (tools list). Built-in tools and skills are merged with this dynamic registry.
      </p>

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
              {tools.filter((t: { enabled?: boolean }) => t.enabled !== false).map((t: { name: string; description?: string; inputSchema?: unknown }) => (
                <li key={t.name} className="rounded border px-3 py-2">
                  <span className="font-semibold">{t.name}</span>
                  {t.description && (
                    <span className="ml-2 text-muted-foreground">— {t.description}</span>
                  )}
                  {t.inputSchema != null && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      inputSchema: {jsonSnippet(t.inputSchema)}
                    </span>
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
              {skills.filter((s: { enabled?: boolean }) => s.enabled !== false).map((s: {
                name: string;
                description?: string;
                instructions?: string;
              }) => (
                <li key={s.name} className="rounded border px-3 py-2">
                  <span className="font-semibold">skill:{s.name}</span>
                  {s.description && (
                    <span className="ml-2 text-muted-foreground">— {s.description}</span>
                  )}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {s.instructions?.trim() ? `instructions: ${snippet(s.instructions, 160)}` : "instructions: (empty)"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rules exposed to AI</CardTitle>
          <p className="text-sm text-muted-foreground">
            Markdown rules from registry. Exposed over MCP as resources (rs4it://rules/&lt;name&gt;).
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : rules.length === 0 ? (
            <p className="text-muted-foreground">No rules in registry.</p>
          ) : (
            <ul className="space-y-2 font-mono text-sm">
              {rules
                .filter((r: { enabled?: boolean }) => r.enabled !== false)
                .map((r: { name: string; description?: string; globs?: string; content?: string }) => (
                  <li key={r.name} className="rounded border px-3 py-2">
                    <span className="font-semibold">rule:{r.name}</span>
                    {r.description && (
                      <span className="ml-2 text-muted-foreground">— {r.description}</span>
                    )}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      uri: rs4it://rules/{r.name}
                      {r.globs?.trim() ? ` · globs: ${r.globs}` : ""}
                      {r.content?.trim() ? ` · content: ${snippet(r.content, 120)}` : ""}
                    </span>
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
              {prompts.filter((p: { enabled?: boolean }) => p.enabled !== false).map((p: {
                name: string;
                title?: string;
                description?: string;
                template?: string;
                argsSchema?: unknown;
              }) => (
                <li key={p.name} className="rounded border px-3 py-2">
                  <span className="font-semibold">{p.name}</span>
                  {p.title && (
                    <span className="ml-2 text-muted-foreground">— {p.title}</span>
                  )}
                  {p.description && (
                    <span className="ml-2 block text-muted-foreground">{p.description}</span>
                  )}
                  {p.template?.trim() && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      template: {snippet(p.template, 200)}
                    </span>
                  )}
                  {p.argsSchema != null && Object.keys(p.argsSchema as object).length > 0 && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      argsSchema: {jsonSnippet(p.argsSchema, 160)}
                    </span>
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
              {resources.filter((r: { enabled?: boolean }) => r.enabled !== false).map((r: {
                name: string;
                uri: string;
                description?: string;
                content?: string;
              }) => (
                <li key={r.name} className="rounded border px-3 py-2">
                  <span className="font-semibold">{r.name}</span>
                  <span className="ml-2 text-muted-foreground">{r.uri}</span>
                  {r.description && (
                    <span className="ml-2 block text-muted-foreground">{r.description}</span>
                  )}
                  {(r.content ?? "").length > 0 && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      content: {(r.content ?? "").length} chars
                      {snippet(r.content ?? "", 120) ? ` · ${snippet(r.content ?? "", 120)}` : ""}
                    </span>
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
