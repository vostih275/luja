import path from "path";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./test.db";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-0123456789abcdef";
process.env.STORAGE_DIR =
  process.env.STORAGE_DIR ?? path.resolve(process.cwd(), "storage", "books-test");
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@test.local";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "AdminPass123!";
process.env.MAX_UPLOAD_MB = process.env.MAX_UPLOAD_MB ?? "50";
