import { NextResponse } from "next/server";
import { credentialsExist } from "@/lib/credentials";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = await credentialsExist();
  const res = NextResponse.json({ configured });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
