import { NextResponse } from "next/server";
import { readCapabilitiesSnapshot } from "@/lib/capabilities";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

export async function GET() {
  try {
    const snapshot = await readCapabilitiesSnapshot();
    return NextResponse.json(snapshot, { headers: NO_STORE_HEADERS });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read capabilities snapshot" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
