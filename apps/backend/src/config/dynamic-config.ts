/**
 * Load dynamic registry from DB (Phase 08).
 * Used by the Hub to merge dynamic tools, plugins, resources, rules.
 */

import type { DynamicRegistry } from "../types/dynamic-registry.js";
import { prisma } from "../db/prisma.js";
import type { Prisma } from "@prisma/client";

/**
 * Persist dynamic registry to DB (Phase 08/02).
 * Used by MCP admin tools to make changes shared for all clients.
 */
export async function writeDynamicRegistry(registry: DynamicRegistry): Promise<void> {
  const tools = Array.isArray(registry.tools) ? registry.tools : [];
  const resources = Array.isArray(registry.resources) ? registry.resources : [];
  const rules = Array.isArray(registry.rules) ? registry.rules : [];
  const plugins = Array.isArray(registry.plugins) ? registry.plugins : [];
  const prompts = Array.isArray((registry as any).prompts) ? (registry as any).prompts : [];
  const skills = Array.isArray((registry as any).skills) ? (registry as any).skills : [];
  const subagents = Array.isArray((registry as any).subagents) ? (registry as any).subagents : [];
  const commands = Array.isArray((registry as any).commands) ? (registry as any).commands : [];

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.registryTool.deleteMany({});
    for (const t of tools) {
      await tx.registryTool.create({
        data: {
          name: t.name,
          description: t.description ?? "",
          inputSchema: (t.inputSchema ?? {}) as any,
          handlerRef: t.handlerRef,
          enabled: Boolean(t.enabled),
          allowedRoles: (t.allowedRoles ?? null) as any,
          source: (t.source ?? "admin") as any,
          origin: t.origin ?? null,
        },
      });
    }

    await tx.registryResource.deleteMany({});
    for (const r of resources) {
      await tx.registryResource.create({
        data: {
          name: r.name,
          uri: r.uri,
          description: r.description ?? null,
          mimeType: r.mimeType,
          content: r.content ?? "",
          enabled: Boolean(r.enabled),
          allowedRoles: (r.allowedRoles ?? null) as any,
          source: (r.source ?? "admin") as any,
          origin: r.origin ?? null,
        },
      });
    }

    await tx.registryRule.deleteMany({});
    for (const rr of rules) {
      await tx.registryRule.create({
        data: {
          name: rr.name,
          description: rr.description ?? "",
          content: rr.content ?? "",
          globs: rr.globs ?? null,
          enabled: Boolean(rr.enabled),
          allowedRoles: (rr.allowedRoles ?? null) as any,
          source: (rr.source ?? "admin") as any,
          origin: rr.origin ?? null,
        },
      });
    }

    await tx.registryPrompt.deleteMany({});
    for (const p of prompts) {
      await tx.registryPrompt.create({
        data: {
          name: String(p.name),
          description: p.description ?? null,
          content: String(p.content ?? ""),
          enabled: Boolean(p.enabled),
          allowedRoles: (p.allowedRoles ?? null) as any,
          source: (p.source ?? "admin") as any,
          origin: p.origin ?? null,
        },
      });
    }

    await tx.registrySkill.deleteMany({});
    for (const s of skills) {
      await tx.registrySkill.create({
        data: {
          name: String(s.name),
          description: s.description ?? null,
          content: String(s.content ?? ""),
          definition: (s.definition ?? null) as any,
          enabled: Boolean(s.enabled),
          allowedRoles: (s.allowedRoles ?? null) as any,
          source: (s.source ?? "admin") as any,
          origin: s.origin ?? null,
        },
      });
    }

    await tx.registrySubagent.deleteMany({});
    for (const sa of subagents) {
      await tx.registrySubagent.create({
        data: {
          name: String(sa.name),
          description: sa.description ?? null,
          content: String(sa.content ?? ""),
          model: sa.model ?? null,
          readonly: Boolean(sa.readonly),
          isBackground: Boolean(sa.isBackground),
          enabled: Boolean(sa.enabled),
          allowedRoles: (sa.allowedRoles ?? null) as any,
          source: (sa.source ?? "admin") as any,
          origin: sa.origin ?? null,
        },
      });
    }

    await tx.registryCommand.deleteMany({});
    for (const c of commands) {
      await tx.registryCommand.create({
        data: {
          name: String(c.name),
          description: c.description ?? null,
          content: String(c.content ?? ""),
          enabled: Boolean(c.enabled),
          allowedRoles: (c.allowedRoles ?? null) as any,
          source: (c.source ?? "admin") as any,
          origin: c.origin ?? null,
        },
      });
    }

    // Plugins are DB-managed separately via PluginConfig.
    // Keep registry.plugins as a compatibility mirror:
    // - upsert PluginConfig rows by id
    for (const pl of plugins) {
      await tx.pluginConfig.upsert({
        where: { id: pl.id },
        create: {
          id: pl.id,
          name: pl.name,
          command: pl.command,
          args: (pl.args ?? []) as any,
          description: pl.description ?? null,
          cwd: pl.cwd ?? null,
          env: (pl.env ?? null) as any,
          timeout: pl.timeout ?? null,
          enabled: Boolean(pl.enabled),
          allowedRoles: (pl.allowedRoles ?? null) as any,
          source: (pl.source ?? "admin") as any,
          origin: pl.origin ?? null,
        },
        update: {
          name: pl.name,
          command: pl.command,
          args: (pl.args ?? []) as any,
          description: pl.description ?? null,
          cwd: pl.cwd ?? null,
          env: (pl.env ?? null) as any,
          timeout: pl.timeout ?? null,
          enabled: Boolean(pl.enabled),
          allowedRoles: (pl.allowedRoles ?? null) as any,
          source: (pl.source ?? "admin") as any,
          origin: pl.origin ?? null,
        },
      });
    }
  });
}

/**
 * Load and parse dynamic registry from DB.
 */
export async function loadDynamicRegistry(): Promise<DynamicRegistry> {
  const [tools, resources, rules, plugins, prompts, skills, subagents, commands] = await Promise.all([
    prisma.registryTool.findMany({ orderBy: { name: "asc" } }),
    prisma.registryResource.findMany({ orderBy: { name: "asc" } }),
    prisma.registryRule.findMany({ orderBy: { name: "asc" } }),
    prisma.pluginConfig.findMany({ orderBy: { id: "asc" } }),
    prisma.registryPrompt.findMany({ orderBy: { name: "asc" } }),
    prisma.registrySkill.findMany({ orderBy: { name: "asc" } }),
    prisma.registrySubagent.findMany({ orderBy: { name: "asc" } }),
    prisma.registryCommand.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    tools: tools.map((t: typeof tools[number]) => ({
      name: t.name,
      description: t.description,
      inputSchema: (t.inputSchema ?? {}) as any,
      handlerRef: t.handlerRef,
      enabled: t.enabled,
      allowedRoles: (t.allowedRoles ?? undefined) as any,
      source: (t.source === "mcp" ? "mcp" : "admin") as any,
      origin: t.origin ?? undefined,
      updatedAt: t.updatedAt.toISOString(),
    })),
    resources: resources.map((r: typeof resources[number]) => ({
      name: r.name,
      uri: r.uri,
      description: r.description ?? undefined,
      mimeType: r.mimeType,
      content: r.content,
      enabled: r.enabled,
      allowedRoles: (r.allowedRoles ?? undefined) as any,
      source: (r.source === "mcp" ? "mcp" : "admin") as any,
      origin: r.origin ?? undefined,
      updatedAt: r.updatedAt.toISOString(),
    })),
    rules: rules.map((rr: typeof rules[number]) => ({
      name: rr.name,
      description: rr.description,
      content: rr.content,
      enabled: rr.enabled,
      globs: rr.globs ?? undefined,
      allowedRoles: (rr.allowedRoles ?? undefined) as any,
      source: (rr.source === "mcp" ? "mcp" : "admin") as any,
      origin: rr.origin ?? undefined,
      updatedAt: rr.updatedAt.toISOString(),
    })),
    plugins: plugins.map((pl: typeof plugins[number]) => ({
      id: pl.id,
      name: pl.name,
      command: pl.command,
      args: (pl.args ?? []) as any,
      description: pl.description ?? undefined,
      enabled: pl.enabled,
      cwd: pl.cwd ?? undefined,
      env: (pl.env ?? undefined) as any,
      timeout: pl.timeout ?? undefined,
      allowedRoles: (pl.allowedRoles ?? undefined) as any,
      source: (pl.source === "mcp" ? "mcp" : "admin") as any,
      origin: pl.origin ?? undefined,
      updatedAt: pl.updatedAt.toISOString(),
    })),
    prompts: prompts.map((p: typeof prompts[number]) => ({
      name: p.name,
      description: p.description ?? undefined,
      content: p.content,
      enabled: p.enabled,
      allowedRoles: (p.allowedRoles ?? undefined) as any,
      source: (p.source === "mcp" ? "mcp" : "admin") as any,
      origin: p.origin ?? undefined,
      updatedAt: p.updatedAt.toISOString(),
    })),
    skills: skills.map((s: typeof skills[number]) => ({
      name: s.name,
      description: s.description ?? undefined,
      content: (s as any).content ?? "",
      definition: (s.definition ?? undefined) as any,
      enabled: s.enabled,
      allowedRoles: (s.allowedRoles ?? undefined) as any,
      source: (s.source === "mcp" ? "mcp" : "admin") as any,
      origin: s.origin ?? undefined,
      updatedAt: s.updatedAt.toISOString(),
    })),
    subagents: subagents.map((sa: typeof subagents[number]) => ({
      name: sa.name,
      description: sa.description ?? undefined,
      content: sa.content ?? "",
      model: sa.model ?? undefined,
      readonly: sa.readonly,
      isBackground: sa.isBackground,
      enabled: sa.enabled,
      allowedRoles: (sa.allowedRoles ?? undefined) as any,
      source: (sa.source === "mcp" ? "mcp" : "admin") as any,
      origin: sa.origin ?? undefined,
      updatedAt: sa.updatedAt.toISOString(),
    })),
    commands: commands.map((c: typeof commands[number]) => ({
      name: c.name,
      description: c.description ?? undefined,
      content: c.content ?? "",
      enabled: c.enabled,
      allowedRoles: (c.allowedRoles ?? undefined) as any,
      source: (c.source === "mcp" ? "mcp" : "admin") as any,
      origin: c.origin ?? undefined,
      updatedAt: c.updatedAt.toISOString(),
    })),
  };
}
