import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import type {
  DynamicCommandEntry,
  DynamicPluginEntry,
  DynamicPromptEntry,
  DynamicRegistry,
  DynamicResourceEntry,
  DynamicSubagentEntry,
  DynamicToolEntry,
} from "@/lib/dynamic-registry-types";

export const dynamic = "force-dynamic";

/* ─── Helpers ─── */

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

function getGithubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Normalise user input to "owner/repo" form. */
function parseRepo(input: string): string | null {
  if (!input) return null;
  const urlMatch = input.match(/github\.com\/([^/]+\/[^/]+)/);
  if (urlMatch) return urlMatch[1].replace(/\.git$/, "");
  if (/^[^/]+\/[^/]+$/.test(input.trim())) return input.trim();
  return null;
}

async function fetchFileContent(repo: string, path: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: getGithubHeaders(),
  });
  if (!res.ok) throw new Error(`File not found: ${path}`);
  const json = (await res.json()) as { content?: string };
  return Buffer.from(json.content ?? "", "base64").toString("utf-8");
}

/**
 * Resolve the content and metadata for a package from a GitHub repo.
 */
async function resolvePackage(
  repo: string,
  type: string,
  _name: string,
  path: string,
): Promise<{ content: string; metadata: Record<string, unknown> }> {
  const mainFile =
    type === "skill"
      ? "SKILL.md"
      : type === "rule"
        ? "RULE.md"
        : type === "prompt"
          ? "PROMPT.md"
          : "CONTENT.md";

  const content = await fetchFileContent(repo, `${path}/${mainFile}`);

  let metadata: Record<string, unknown> = {};
  try {
    const metaContent = await fetchFileContent(repo, `${path}/metadata.json`);
    metadata = JSON.parse(metaContent) as Record<string, unknown>;
  } catch {
    /* no metadata */
  }

  return { content, metadata };
}

/* ─── Hub registry helpers ─── */

async function loadHubRegistry(): Promise<DynamicRegistry> {
  const res = await fetch(`${hubBaseUrl()}/api/registry`, { headers: hubHeaders(), cache: "no-store" });
  const payload = (await res.json()) as { ok?: boolean; registry?: DynamicRegistry };
  const raw = (payload.registry ?? payload) as Partial<DynamicRegistry>;
  return {
    tools: raw.tools ?? [],
    plugins: raw.plugins ?? [],
    resources: raw.resources ?? [],
    rules: raw.rules ?? [],
    prompts: raw.prompts ?? [],
    skills: raw.skills ?? [],
    subagents: raw.subagents ?? [],
    commands: raw.commands ?? [],
  };
}

async function fetchHubPrompts(): Promise<DynamicPromptEntry[]> {
  const res = await fetch(`${hubBaseUrl()}/api/prompts`, { headers: hubHeaders(), cache: "no-store" });
  const data = (await res.json()) as { prompts?: DynamicPromptEntry[] };
  return Array.isArray(data?.prompts) ? [...data.prompts] : [];
}

async function putHubPrompts(prompts: DynamicPromptEntry[]): Promise<void> {
  await fetch(`${hubBaseUrl()}/api/prompts`, {
    method: "PUT",
    headers: { ...hubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ prompts }),
    cache: "no-store",
  });
}

async function fetchHubSubagents(): Promise<DynamicSubagentEntry[]> {
  const res = await fetch(`${hubBaseUrl()}/api/subagents`, { headers: hubHeaders(), cache: "no-store" });
  const data = (await res.json()) as { subagents?: DynamicSubagentEntry[] } | DynamicSubagentEntry[];
  if (Array.isArray(data)) return [...data];
  return Array.isArray(data?.subagents) ? [...data.subagents] : [];
}

async function putHubSubagents(subagents: DynamicSubagentEntry[]): Promise<void> {
  await fetch(`${hubBaseUrl()}/api/subagents`, {
    method: "PUT",
    headers: { ...hubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ subagents }),
    cache: "no-store",
  });
}

async function fetchHubCommands(): Promise<DynamicCommandEntry[]> {
  const res = await fetch(`${hubBaseUrl()}/api/commands`, { headers: hubHeaders(), cache: "no-store" });
  const data = (await res.json()) as { commands?: DynamicCommandEntry[] } | DynamicCommandEntry[];
  if (Array.isArray(data)) return [...data];
  return Array.isArray(data?.commands) ? [...data.commands] : [];
}

async function putHubCommands(commands: DynamicCommandEntry[]): Promise<void> {
  await fetch(`${hubBaseUrl()}/api/commands`, {
    method: "PUT",
    headers: { ...hubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ commands }),
    cache: "no-store",
  });
}

/* ─── Main handler ─── */

export async function POST(request: NextRequest) {
  if (!requireSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { type, name, version, path, repo: repoInput, allowedRoles } = body as {
      type: string;
      name: string;
      version: string;
      path: string;
      repo: string;
      allowedRoles?: string[];
    };

    if (!type || !name || !path) {
      return NextResponse.json({ error: "Missing type, name, or path" }, { status: 400 });
    }

    const repo = parseRepo(repoInput ?? "");
    if (!repo) {
      return NextResponse.json({ error: "Missing or invalid repo" }, { status: 400 });
    }

    // Resolve content from GitHub repo
    const { content, metadata } = await resolvePackage(repo, type, name, path);

    const entityName = (metadata.name as string) ?? name;
    const description = (metadata.description as string) ?? "";

    // Merge allowedRoles from request (UI role picker) into metadata
    const rolesMixin = allowedRoles && allowedRoles.length > 0 ? { allowedRoles } : {};

    if (type === "skill") {
      const existingRes = await fetch(`${hubBaseUrl()}/api/skills`, {
        headers: hubHeaders(),
        cache: "no-store",
      });
      const data = (await existingRes.json()) as { skills?: Array<Record<string, unknown>> };
      const skills = Array.isArray(data?.skills) ? [...data.skills] : [];
      const idx = skills.findIndex((s) => (s as { name?: string }).name === entityName);
      const entry = { name: entityName, description, content, enabled: true, ...metadata, ...rolesMixin };
      if (idx !== -1) skills[idx] = { ...(skills[idx] as object), ...entry };
      else skills.push(entry);
      await fetch(`${hubBaseUrl()}/api/skills`, {
        method: "PUT",
        headers: { ...hubHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ skills }),
        cache: "no-store",
      });
    } else if (type === "rule") {
      const registry = await loadHubRegistry();
      const rules = Array.isArray(registry.rules) ? [...registry.rules] : [];
      const idx = rules.findIndex((r) => r.name === entityName);
      const entry = {
        name: entityName,
        description: description || entityName,
        content,
        enabled: true,
        globs: typeof metadata.globs === "string" ? metadata.globs : undefined,
        ...metadata,
        ...rolesMixin,
      };
      if (idx !== -1) rules[idx] = { ...rules[idx], ...entry };
      else rules.push(entry);
      const next: DynamicRegistry = { ...registry, rules };
      await fetch(`${hubBaseUrl()}/api/registry`, {
        method: "PUT",
        headers: { ...hubHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ registry: next }),
        cache: "no-store",
      });
    } else if (type === "prompt") {
      const prompts = await fetchHubPrompts();
      const idx = prompts.findIndex((p) => p.name === entityName);
      const entry: DynamicPromptEntry = {
        name: entityName,
        description: description || undefined,
        content,
        enabled: true,
        ...(metadata as Partial<DynamicPromptEntry>),
        ...rolesMixin,
      };
      if (idx !== -1) prompts[idx] = { ...prompts[idx], ...entry };
      else prompts.push(entry);
      await putHubPrompts(prompts);
    } else if (type === "resource") {
      const registry = await loadHubRegistry();
      const resources = Array.isArray(registry.resources) ? [...registry.resources] : [];
      const idx = resources.findIndex((r) => r.name === entityName);
      const uri =
        typeof metadata.uri === "string" && metadata.uri.length > 0
          ? metadata.uri
          : `resource://${encodeURIComponent(entityName)}`;
      const mimeType =
        typeof metadata.mimeType === "string" && metadata.mimeType.length > 0
          ? metadata.mimeType
          : "text/markdown";
      const entry: DynamicResourceEntry = {
        name: entityName,
        uri,
        mimeType,
        description: description || undefined,
        content,
        enabled: true,
        ...(metadata as Partial<DynamicResourceEntry>),
        ...rolesMixin,
      };
      if (idx !== -1) resources[idx] = { ...resources[idx], ...entry };
      else resources.push(entry);
      const next: DynamicRegistry = { ...registry, resources };
      await fetch(`${hubBaseUrl()}/api/registry`, {
        method: "PUT",
        headers: { ...hubHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ registry: next }),
        cache: "no-store",
      });
    } else if (type === "subagent") {
      const subagents = await fetchHubSubagents();
      const idx = subagents.findIndex((s) => s.name === entityName);
      const entry: DynamicSubagentEntry = {
        name: entityName,
        description: description || undefined,
        content,
        enabled: true,
        model: typeof metadata.model === "string" ? metadata.model : undefined,
        readonly: Boolean(metadata.readonly),
        isBackground: Boolean(metadata.isBackground),
        ...(metadata as Partial<DynamicSubagentEntry>),
        ...rolesMixin,
      };
      if (idx !== -1) subagents[idx] = { ...subagents[idx], ...entry };
      else subagents.push(entry);
      await putHubSubagents(subagents);
    } else if (type === "command") {
      const commands = await fetchHubCommands();
      const idx = commands.findIndex((c) => c.name === entityName);
      const entry: DynamicCommandEntry = {
        name: entityName,
        description: description || undefined,
        content,
        enabled: true,
        ...(metadata as Partial<DynamicCommandEntry>),
        ...rolesMixin,
      };
      if (idx !== -1) commands[idx] = { ...commands[idx], ...entry };
      else commands.push(entry);
      await putHubCommands(commands);
    } else if (type === "tool") {
      const registry = await loadHubRegistry();
      const tools = Array.isArray(registry.tools) ? [...registry.tools] : [];
      const idx = tools.findIndex((t) => t.name === entityName);
      const handlerRef =
        typeof metadata.handlerRef === "string" && metadata.handlerRef.length > 0
          ? metadata.handlerRef
          : entityName;
      const inputSchema =
        metadata.inputSchema && typeof metadata.inputSchema === "object"
          ? (metadata.inputSchema as Record<string, unknown>)
          : ({} as Record<string, unknown>);
      const entry: DynamicToolEntry = {
        name: entityName,
        description: description || entityName,
        handlerRef,
        inputSchema,
        enabled: true,
        ...(metadata as Partial<DynamicToolEntry>),
        ...rolesMixin,
      };
      if (idx !== -1) tools[idx] = { ...tools[idx], ...entry };
      else tools.push(entry);
      const next: DynamicRegistry = { ...registry, tools };
      await fetch(`${hubBaseUrl()}/api/registry`, {
        method: "PUT",
        headers: { ...hubHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ registry: next }),
        cache: "no-store",
      });
    } else if (type === "plugin") {
      const registry = await loadHubRegistry();
      const plugins = Array.isArray(registry.plugins) ? [...registry.plugins] : [];
      const pluginId = String(metadata.id ?? metadata.pluginId ?? entityName).trim();
      const command = String(metadata.command ?? "").trim();
      if (!pluginId || !command) {
        return NextResponse.json(
          { error: "Plugin marketplace package must include id (or name) and command in metadata.json" },
          { status: 400 },
        );
      }
      const args = Array.isArray(metadata.args)
        ? (metadata.args as string[])
        : typeof metadata.args === "string"
          ? [metadata.args]
          : [];
      const idx = plugins.findIndex((p) => p.id === pluginId);
      const entry: DynamicPluginEntry = {
        id: pluginId,
        name: String(metadata.displayName ?? metadata.name ?? entityName),
        command,
        args,
        description: description || undefined,
        enabled: metadata.enabled !== false,
        cwd: typeof metadata.cwd === "string" ? metadata.cwd : undefined,
        env:
          typeof metadata.env === "object" && metadata.env !== null && !Array.isArray(metadata.env)
            ? (metadata.env as Record<string, string>)
            : undefined,
        timeout: typeof metadata.timeout === "number" ? metadata.timeout : undefined,
        ...(metadata as Partial<DynamicPluginEntry>),
        ...rolesMixin,
      };
      if (idx !== -1) plugins[idx] = { ...plugins[idx], ...entry };
      else plugins.push(entry);
      const next: DynamicRegistry = { ...registry, plugins };
      await fetch(`${hubBaseUrl()}/api/registry`, {
        method: "PUT",
        headers: { ...hubHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ registry: next }),
        cache: "no-store",
      });
    } else {
      return NextResponse.json({ error: `Unsupported type: ${type}` }, { status: 400 });
    }

    try {
      await fetch(`${hubBaseUrl()}/api/marketplace/track`, {
        method: "POST",
        headers: { ...hubHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ type, name: entityName, version, sourceRepo: repo }),
        cache: "no-store",
      });
    } catch {
      /* optional tracking */
    }

    return NextResponse.json({ installed: entityName, type, version });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
