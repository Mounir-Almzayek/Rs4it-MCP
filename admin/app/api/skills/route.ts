import { NextRequest, NextResponse } from "next/server";
import { readRegistry, writeRegistry, type DynamicSkillEntry } from "@/lib/registry";

export async function GET() {
  try {
    const registry = await readRegistry();
    return NextResponse.json(registry.skills);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read skills" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<DynamicSkillEntry>;
    const entry: DynamicSkillEntry = {
      name: body.name ?? "",
      description: body.description ?? "",
      inputSchema: body.inputSchema ?? {},
      steps: body.steps ?? [],
      enabled: body.enabled ?? true,
      updatedAt: new Date().toISOString(),
    };
    const registry = await readRegistry();
    if (registry.skills.some((s) => s.name === entry.name)) {
      return NextResponse.json(
        { error: "Skill with this name already exists" },
        { status: 409 }
      );
    }
    registry.skills.push(entry);
    await writeRegistry(registry);
    return NextResponse.json(entry);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create skill" },
      { status: 500 }
    );
  }
}
