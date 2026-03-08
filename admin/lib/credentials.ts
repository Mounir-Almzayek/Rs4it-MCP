/**
 * Admin credentials storage (Phase 10).
 * Username + bcrypt password hash only. Path via ADMIN_CREDENTIALS_PATH.
 */

import path from "path";
import fs from "fs/promises";
import { hash, compare } from "bcryptjs";

const SALT_ROUNDS = 10;
const DEFAULT_PATH = path.join(process.cwd(), "..", "config", "admin-credentials.json");

export interface StoredCredentials {
  username: string;
  passwordHash: string;
}

function getCredentialsPath(): string {
  const env = process.env.ADMIN_CREDENTIALS_PATH;
  if (env) return path.resolve(env);
  return path.resolve(DEFAULT_PATH);
}

export async function credentialsExist(): Promise<boolean> {
  try {
    await fs.access(getCredentialsPath());
    return true;
  } catch {
    return false;
  }
}

export async function getCredentials(): Promise<StoredCredentials | null> {
  try {
    const raw = await fs.readFile(getCredentialsPath(), "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || typeof (data as StoredCredentials).username !== "string" || typeof (data as StoredCredentials).passwordHash !== "string") {
      return null;
    }
    return data as StoredCredentials;
  } catch {
    return null;
  }
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const stored = await getCredentials();
  if (!stored) return false;
  if (stored.username !== username) return false;
  return compare(password, stored.passwordHash);
}

export async function saveCredentials(username: string, password: string): Promise<void> {
  const passwordHash = await hash(password, SALT_ROUNDS);
  const filePath = getCredentialsPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    JSON.stringify({ username: username.trim(), passwordHash }, null, 2),
    "utf-8"
  );
}

export async function updateCredentials(options: {
  newUsername?: string;
  newPassword?: string;
  currentPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  const stored = await getCredentials();
  if (!stored) return { success: false, error: "No credentials configured" };
  const valid = await compare(options.currentPassword, stored.passwordHash);
  if (!valid) return { success: false, error: "Current password is incorrect" };

  const username = options.newUsername?.trim() ?? stored.username;
  const password = options.newPassword ?? options.currentPassword;
  if (username.length === 0) return { success: false, error: "Username cannot be empty" };
  if (options.newPassword && options.newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters" };
  }

  await saveCredentials(username, password);
  return { success: true };
}
