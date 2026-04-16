import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { requireSession } from "@/lib/auth";

const MAX_SIZE = 5 * 1024 * 1024;

function hubBaseUrl(): string {
  return (process.env.ADMIN_HUB_BASE_URL ?? process.env.HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function hubHeaders(): Record<string, string> {
  const secret = process.env.ADMIN_HUB_SECRET ?? process.env.MCP_ADMIN_API_SECRET ?? "";
  return secret ? { "x-admin-secret": secret } : {};
}

interface ParsedSkill {
  name: string;
  description?: string;
  content: string;
  definition?: unknown;
  enabled: boolean;
  allowedRoles?: string[];
}

function parseSkillMd(content: string): { definition?: unknown } {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return {};
  try {
    return { definition: JSON.parse(jsonMatch[1]) };
  } catch {
    return {};
  }
}

async function extractSkillsFromZip(buffer: ArrayBuffer): Promise<{ skills: ParsedSkill[]; errors: string[] }> {
  const zip = await JSZip.loadAsync(buffer);
  const skills: ParsedSkill[] = [];
  const errors: string[] = [];

  const skillFiles: { path: string; file: JSZip.JSZipObject }[] = [];
  zip.forEach((path, file) => {
    if (file.name.endsWith("SKILL.md") && !file.dir) {
      skillFiles.push({ path, file });
    }
  });

  for (const { path, file } of skillFiles) {
    try {
      const content = await file.async("string");
      const parts = path.split("/").filter(Boolean);

      let name: string;
      if (parts.length >= 2) {
        name = parts[parts.length - 2];
      } else {
        name = "unnamed-skill";
      }

      const dir = parts.length >= 2 ? `${parts.slice(0, -1).join("/")}/` : "";
      const metaFile = zip.file(`${dir}metadata.json`);
      let meta: Record<string, unknown> = {};
      if (metaFile) {
        try {
          meta = JSON.parse(await metaFile.async("string")) as Record<string, unknown>;
        } catch {
          /* ignore */
        }
      }

      const parsed = parseSkillMd(content);

      skills.push({
        name: (meta.name as string) ?? name,
        description: (meta.description as string) ?? undefined,
        content,
        definition: parsed.definition,
        enabled: (meta.enabled as boolean) ?? true,
        allowedRoles: Array.isArray(meta.allowedRoles) ? (meta.allowedRoles as string[]) : undefined,
      });
    } catch (err) {
      errors.push(`Failed to parse ${path}: ${(err as Error).message}`);
    }
  }

  return { skills, errors };
}

export async function POST(request: NextRequest) {
  const session = requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { skills, errors } = await extractSkillsFromZip(buffer);

    if (skills.length === 0) {
      return NextResponse.json({ error: "No SKILL.md files found in zip", errors }, { status: 400 });
    }

    const existingRes = await fetch(`${hubBaseUrl()}/api/skills`, {
      headers: hubHeaders(),
      cache: "no-store",
    });
    const existingPayload = (await existingRes.json()) as { skills?: Array<{ name: string }> };
    const existingSkills: Array<{ name: string }> = Array.isArray(existingPayload?.skills)
      ? existingPayload.skills
      : [];
    const existingNames = new Set(existingSkills.map((s) => s.name));

    const created: string[] = [];
    const updated: string[] = [];

    const allSkills = [...existingSkills];
    for (const skill of skills) {
      if (existingNames.has(skill.name)) {
        const idx = allSkills.findIndex((s) => s.name === skill.name);
        if (idx !== -1) allSkills[idx] = { ...allSkills[idx], ...skill };
        updated.push(skill.name);
      } else {
        allSkills.push(skill as (typeof allSkills)[number]);
        created.push(skill.name);
      }
    }

    await fetch(`${hubBaseUrl()}/api/skills`, {
      method: "PUT",
      headers: { ...hubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ skills: allSkills }),
      cache: "no-store",
    });

    return NextResponse.json({ created, updated, errors });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed: " + (err as Error).message }, { status: 500 });
  }
}
