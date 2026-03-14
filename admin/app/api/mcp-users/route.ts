import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { readMcpUsers } from "@/lib/mcp-users";

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await readMcpUsers();
    return NextResponse.json(users);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read MCP users" },
      { status: 500 }
    );
  }
}
