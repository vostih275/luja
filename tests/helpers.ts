import { execSync } from "child_process";
import path from "path";
import fs from "fs/promises";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { ensureStorageDir } from "../lib/storage";

export function setupTestEnv() {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./test.db";
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-0123456789abcdef";
  process.env.STORAGE_DIR = process.env.STORAGE_DIR ?? path.resolve(__dirname, "..", "storage", "books-test");
  process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@test.local";
  process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "AdminPass123!";
  process.env.MAX_UPLOAD_MB = process.env.MAX_UPLOAD_MB ?? "50";
}

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL!;
  const password = process.env.ADMIN_PASSWORD!;
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: await bcrypt.hash(password, 10), role: "ADMIN" },
    create: { email, passwordHash: await bcrypt.hash(password, 10), role: "ADMIN" },
  });
}

export async function createUser(email: string, password: string, role: "ADMIN" | "READER") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role,
    },
  });
}

export async function createBookAndFile() {
  const { generateStorageKey, resolveSafeBookPath } = await import("../lib/storage");
  const key = generateStorageKey();
  await ensureStorageDir();
  await fs.writeFile(resolveSafeBookPath(key), Buffer.from("test book content"));
  const book = await prisma.book.create({
    data: {
      title: "Test Book",
      author: "Test Author",
      description: "A test book",
      fileStorageKey: key,
      mimeType: "application/pdf",
      fileSizeBytes: 20,
    },
  });
  return { book, key };
}

export async function clearTestStorage() {
  const dir = process.env.STORAGE_DIR!;
  try {
    const entries = await fs.readdir(dir);
    await Promise.all(entries.map((e) => fs.unlink(path.join(dir, e))));
  } catch {
    // ignore
  }
}

export function resetTestDatabase() {
  execSync("npx prisma db push --force-reset --accept-data-loss --skip-generate", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL! },
  });
}
