import { execSync } from "child_process";
import path from "path";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./test.db";
process.env.STORAGE_DIR =
  process.env.STORAGE_DIR ?? path.resolve(process.cwd(), "storage", "books-test");

export default function setupTestDatabase() {
  execSync("npx prisma db push --force-reset --accept-data-loss --skip-generate", {
    stdio: "ignore",
    env: process.env,
  });
}
