import z from "zod";

const BOOK_MIME_TYPES = new Set(["application/pdf", "application/epub+zip"]);
const COVER_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB ?? 50);

export const loginSchema = z.object({
  email: z.email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8),
});

export const bookCreateSchema = z.object({
  title: z.string().min(1).max(255),
  author: z.string().min(1).max(255),
  description: z.string().max(5000),
  publicationDate: z.string().datetime().optional().or(z.literal("")),
});

export const bookUpdateSchema = bookCreateSchema.partial();

export const accessGrantSchema = z.object({
  email: z.email().transform((v) => v.trim().toLowerCase()),
  bookId: z.string().uuid(),
});

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>"|?*\x00-\x1f]/g, "_")
    .replace(/[:\\/]/g, "_")
    .trim();
}

export function validateMimeType(mime: string, kind: "book" | "cover"): void {
  const allowed = kind === "book" ? BOOK_MIME_TYPES : COVER_MIME_TYPES;
  if (!allowed.has(mime)) {
    throw new Error(`Unsupported file type: ${mime}`);
  }
}

export function validateFileSize(sizeBytes: number, maxMb = MAX_UPLOAD_MB): void {
  if (sizeBytes > maxMb * 1024 * 1024) {
    throw new Error(`File exceeds ${maxMb}MB limit`);
  }
}

export function validateStorageKey(key: string): void {
  const uuid = z.string().uuid();
  uuid.parse(key);
}
