import { NextResponse } from "next/server";
import { readPluginStatus } from "@/lib/plugin-status";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await readPluginStatus();
    return NextResponse.json(snapshot ?? { updatedAt: null, plugins: [] }, {
      headers: NO_STORE,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read plugin status" },
      { status: 500, headers: NO_STORE }
    );
  }
}
