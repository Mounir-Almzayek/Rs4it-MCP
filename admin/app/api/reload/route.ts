import { NextResponse } from "next/server";

/**
 * Reload trigger: Hub reads dynamic registry on each new session / createServer.
 * This endpoint exists for UI feedback; no server-side reload needed.
 */
export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Registry file will be read on next Hub request or session.",
  });
}
