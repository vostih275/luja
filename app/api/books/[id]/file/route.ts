import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveSafeBookPath } from "@/lib/storage";
import { logAction } from "@/lib/audit";
import { sanitizeFilename } from "@/lib/validation";

function mimeExtension(mimeType: string): string {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "application/epub+zip") return "epub";
  return "bin";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = await params;
  const ip = getClientIp(req);

  const { allowed, retryAfter } = rateLimit(`${ip}:file:${bookId}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permitted =
    user.role === "ADMIN" ||
    !!(await prisma.permission.findUnique({
      where: { userId_bookId: { userId: user.id, bookId } },
    }));

  if (!permitted) {
    await logAction({
      action: "BOOK_ACCESS_DENIED",
      actorId: user.id,
      targetBookId: bookId,
      ipAddress: ip,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const filePath = resolveSafeBookPath(book.fileStorageKey);
  if (!filePath.startsWith(path.resolve(process.env.STORAGE_DIR ?? "./storage/books") + path.sep)) {
    return NextResponse.json({ error: "Invalid storage path" }, { status: 500 });
  }
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  await logAction({
    action: "BOOK_ACCESS",
    actorId: user.id,
    targetBookId: book.id,
    ipAddress: ip,
  });

  const fileStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;

  const sanitizedTitle = sanitizeFilename(book.title).slice(0, 80) || "book";
  const extension = mimeExtension(book.mimeType);

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": book.mimeType,
      "Content-Disposition": `inline; filename="${sanitizedTitle}.${extension}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
