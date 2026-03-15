"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function fetchRegistry() {
  const res = await fetch("/api/registry", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch registry");
  return res.json();
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
    </div>
  );
}
