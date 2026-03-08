import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getCredentials, updateCredentials } from "@/lib/credentials";

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stored = await getCredentials();
  if (!stored) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }
  return NextResponse.json({ username: stored.username });
}

export async function PUT(request: NextRequest) {
  const session = requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      currentPassword?: string;
      newUsername?: string;
      newPassword?: string;
      confirmNewPassword?: string;
    };
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 }
      );
    }
    if (body.newPassword && body.newPassword !== body.confirmNewPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match" },
        { status: 400 }
      );
    }

    const result = await updateCredentials({
      currentPassword,
      newUsername: body.newUsername,
      newPassword: body.newPassword,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Update failed" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}
