import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { readUsageStats } from "@/lib/usage";

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const recentLimit = searchParams.get("recentLimit");
    const since = searchParams.get("since") ?? undefined;
    const stats = await readUsageStats({
      recentLimit: recentLimit ? parseInt(recentLimit, 10) : undefined,
      since,
    });
    return NextResponse.json(stats);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read usage stats" },
      { status: 500 }
    );
  }
}
