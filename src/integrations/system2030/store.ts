/**
 * System2030 session store backed by database (SQLite via Prisma).
 */

import type { System2030Programmer } from "./types.js";
import { prisma } from "../../db/prisma.js";

export interface System2030SessionRecord {
  email: string;
  token: string;
  notificationToken?: string;
  userId?: number;
  programmer?: System2030Programmer;
  createdAt: string;
  updatedAt: string;
  lastMeAt?: string;
  lastLoginAt?: string;
}

function iso(d: Date | null | undefined): string | undefined {
  return d ? d.toISOString() : undefined;
}

function toDateOrNull(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function toSessionRecord(row: any): System2030SessionRecord {
  return {
    email: String(row.email),
    token: String(row.token),
    notificationToken: row.notificationToken ?? undefined,
    userId: row.userId ?? undefined,
    programmer: (row.programmer ?? undefined) as System2030Programmer | undefined,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    lastMeAt: iso(row.lastMeAt),
    lastLoginAt: iso(row.lastLoginAt),
  };
}

export async function upsertSystem2030Session(
  patch: Omit<System2030SessionRecord, "createdAt" | "updatedAt"> & { email: string }
): Promise<System2030SessionRecord> {
  const email = patch.email.trim().toLowerCase();
  if (!email) throw new Error("Email is required.");

  const now = new Date();
  const row = await prisma.system2030Session.upsert({
    where: { email },
    create: {
      email,
      token: patch.token,
      notificationToken: patch.notificationToken ?? null,
      userId: patch.userId ?? null,
      programmer: (patch.programmer as any) ?? null,
      createdAt: now,
      updatedAt: now,
      lastMeAt: toDateOrNull(patch.lastMeAt ?? undefined),
      lastLoginAt: toDateOrNull(patch.lastLoginAt ?? undefined),
    },
    update: {
      token: patch.token,
      notificationToken: patch.notificationToken ?? null,
      userId: patch.userId ?? null,
      programmer: (patch.programmer as any) ?? undefined,
      lastMeAt: patch.lastMeAt !== undefined ? toDateOrNull(patch.lastMeAt) : undefined,
      lastLoginAt: patch.lastLoginAt !== undefined ? toDateOrNull(patch.lastLoginAt) : undefined,
      updatedAt: now,
    },
  });
  return toSessionRecord(row);
}

export async function getSystem2030SessionByEmail(email: string): Promise<System2030SessionRecord | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  const row = await prisma.system2030Session.findUnique({ where: { email: e } });
  return row ? toSessionRecord(row) : null;
}

export async function listSystem2030Sessions(): Promise<System2030SessionRecord[]> {
  const rows = await prisma.system2030Session.findMany({ orderBy: { updatedAt: "desc" } });
  return rows.map(toSessionRecord);
}

export async function deleteSystem2030SessionByEmail(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (!e) return false;
  const res = await prisma.system2030Session.deleteMany({ where: { email: e } });
  return res.count > 0;
}

