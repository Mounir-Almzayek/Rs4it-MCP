/**
 * Admin: read System2030 sessions (tokens + last /me programmer snapshot).
 * Same file as Hub writes to (config/system2030_sessions.json or SYSTEM2030_SESSIONS_FILE).
 */

import path from "path";
import fs from "fs/promises";

export interface System2030Programmer {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  description?: string | null;
  status?: string | null;
  difficulty_level?: string | null;
  work_start_time?: string | null;
  work_end_time?: string | null;
  work_hours?: number | null;
  join_date?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  personal_picture_url?: string | null;
  [k: string]: unknown;
}

export interface System2030SessionRecord {
  email: string;
  token?: string;
  notificationToken?: string;
  userId?: number;
  programmer?: System2030Programmer;
  createdAt: string;
  updatedAt: string;
  lastMeAt?: string;
  lastLoginAt?: string;
}

const DEFAULT_PATH = path.join(process.cwd(), "..", "config", "system2030_sessions.json");

function getSessionsPath(): string {
  const env = process.env.SYSTEM2030_SESSIONS_FILE ?? process.env.ADMIN_SYSTEM2030_SESSIONS_FILE;
  if (env) return path.resolve(env);
  return path.resolve(DEFAULT_PATH);
}

export async function readSystem2030Sessions(): Promise<System2030SessionRecord[]> {
  const filePath = getSessionsPath();
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return [];
    const list = Array.isArray((data as { sessions?: unknown }).sessions)
      ? ((data as { sessions: System2030SessionRecord[] }).sessions ?? [])
      : [];
    const records = list.filter(
      (x): x is System2030SessionRecord =>
        !!x &&
        typeof x === "object" &&
        typeof (x as System2030SessionRecord).email === "string" &&
        typeof (x as System2030SessionRecord).createdAt === "string" &&
        typeof (x as System2030SessionRecord).updatedAt === "string"
    );
    records.sort((a, b) => ((b.lastMeAt ?? b.updatedAt) < (a.lastMeAt ?? a.updatedAt) ? -1 : 1));
    return records;
  } catch {
    return [];
  }
}

