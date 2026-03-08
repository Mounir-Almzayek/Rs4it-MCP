import { NextResponse } from "next/server";
import { readRegistry } from "@/lib/registry";

export async function GET() {
  try {
    const registry = await readRegistry();
    return NextResponse.json(registry);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read registry" },
      { status: 500 }
    );
  }
}
