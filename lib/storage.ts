import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

export function getStorageDir(): string {
  return path.resolve(process.env.STORAGE_DIR ?? "./storage/books");
}

export async function ensureStorageDir(): Promise<void> {
  await fs.mkdir(getStorageDir(), { recursive: true });
}

export function generateStorageKey(): string {
  return randomUUID();
}

export function resolveSafeBookPath(fileStorageKey: string): string {
  if (path.dirname(fileStorageKey) !== "." || fileStorageKey.includes("..")) {
    throw new Error("Invalid storage key");
  }
  const dir = getStorageDir();
  const target = path.resolve(dir, fileStorageKey);
  if (!target.startsWith(dir + path.sep)) {
    throw new Error("Path traversal detected");
  }
  return target;
}

export async function writeBookFile(fileStorageKey: string, buffer: Buffer): Promise<void> {
  await ensureStorageDir();
  const target = resolveSafeBookPath(fileStorageKey);
  await fs.writeFile(target, buffer);
}
