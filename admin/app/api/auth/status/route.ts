import { NextResponse } from "next/server";
import { credentialsExist } from "@/lib/credentials";

export async function GET() {
  const configured = await credentialsExist();
  return NextResponse.json({ configured });
}
