import { NextResponse } from "next/server";
import { readRegistry } from "@/lib/registry";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

export async function GET() {
  try {
    const registry = await readRegistry();
    return NextResponse.json(registry, {
      headers: NO_STORE_HEADERS,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read registry" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
