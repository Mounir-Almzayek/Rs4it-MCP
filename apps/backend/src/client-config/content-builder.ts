/**
 * Collect rules, tools, and skills from DB + registry, filtered by role.
 */

import { loadDynamicRegistry } from "../config/dynamic-config.js";
import { isAllowedForRole } from "../config/roles.js";
import { getAllTools } from "../tools/index.js";
import { getAllPluginTools } from "../plugins/index.js";
import { SERVER_NAME, SERVER_VERSION } from "../config/constants.js";
import type { ContentPayload, ToolInfo, RuleInfo, SkillInfo, PromptInfo, ResourceInfo, SubagentInfo, CommandInfo } from "./types.js";

export async function collectContent(role?: string): Promise<ContentPayload> {
  const dynamic = await loadDynamicRegistry();

  // Rules
  const rules: RuleInfo[] = [];
  for (const r of dynamic.rules) {
    if (!r.enabled) continue;
    if (role && !(await isAllowedForRole(r.allowedRoles, role))) continue;
    rules.push({
      name: r.name,
      description: r.description,
      content: r.content,
      globs: r.globs,
    });
  }

  // Tools — built-in
  const tools: ToolInfo[] = [];
  for (const t of getAllTools()) {
    tools.push({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    });
  }

  // Tools — dynamic (DB)
  for (const t of dynamic.tools) {
    if (!t.enabled) continue;
    if (role && !(await isAllowedForRole(t.allowedRoles, role))) continue;
    tools.push({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    });
  }

  // Tools — plugins
  for (const pt of getAllPluginTools()) {
    tools.push({
      name: pt.name,
      description: pt.description ?? "",
      parameters: pt.inputSchema ?? {},
    });
  }

  // Skills
  const skills: SkillInfo[] = [];
  for (const s of dynamic.skills ?? []) {
    if (!s.enabled) continue;
    if (role && !(await isAllowedForRole(s.allowedRoles, role))) continue;
    skills.push({
      name: s.name,
      description: s.description ?? "",
      content: s.content,
    });
  }

  // Prompts
  const prompts: PromptInfo[] = [];
  for (const p of dynamic.prompts ?? []) {
    if (!p.enabled) continue;
    if (role && !(await isAllowedForRole(p.allowedRoles, role))) continue;
    prompts.push({
      name: p.name,
      description: p.description ?? undefined,
      content: p.content ?? "",
    });
  }

  // Resources
  const resources: ResourceInfo[] = [];
  for (const r of dynamic.resources ?? []) {
    if (!r.enabled) continue;
    if (role && !(await isAllowedForRole(r.allowedRoles, role))) continue;
    resources.push({
      name: r.name,
      uri: r.uri,
      description: r.description ?? undefined,
      mimeType: r.mimeType,
      content: r.content ?? "",
    });
  }

  // Subagents
  const subagents: SubagentInfo[] = [];
  for (const s of dynamic.subagents ?? []) {
    if (!s.enabled) continue;
    if (role && !(await isAllowedForRole(s.allowedRoles, role))) continue;
    subagents.push({
      name: s.name,
      description: s.description ?? undefined,
      content: s.content ?? "",
      model: s.model ?? undefined,
      readonly: s.readonly ?? undefined,
      isBackground: s.isBackground ?? undefined,
    });
  }

  // Commands
  const commands: CommandInfo[] = [];
  for (const c of dynamic.commands ?? []) {
    if (!c.enabled) continue;
    if (role && !(await isAllowedForRole(c.allowedRoles, role))) continue;
    commands.push({
      name: c.name,
      description: c.description ?? undefined,
      content: c.content ?? "",
    });
  }

  return {
    hubName: SERVER_NAME,
    hubVersion: SERVER_VERSION,
    rules,
    tools,
    skills,
    prompts,
    resources,
    subagents,
    commands,
  };
}
