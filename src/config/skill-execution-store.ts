import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { ExecutionTrace } from "../skill-compiler/executor.js";

export type StoredSkillExecution = {
  id: string;
  skillName: string;
  createdAt: string;
  trace: ExecutionTrace;
};

const DEFAULT_PATH = "config/skill_executions.json";

function getPath(): string {
  const env = process.env["MCP_SKILL_EXECUTIONS_FILE"];
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), DEFAULT_PATH);
}

async function readAll(): Promise<StoredSkillExecution[]> {
  const filePath = getPath();
  try {
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data as StoredSkillExecution[];
  } catch {
    return [];
  }
}

export async function appendSkillExecution(entry: StoredSkillExecution): Promise<void> {
  const filePath = getPath();
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const all = await readAll();
  all.push(entry);
  // Cap size to avoid unbounded growth.
  const capped = all.length > 2000 ? all.slice(all.length - 2000) : all;
  await writeFile(filePath, JSON.stringify(capped, null, 2), "utf-8");
}

