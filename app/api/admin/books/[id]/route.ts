import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bookUpdateSchema } from "@/lib/validation";
import { resolveSafeBookPath } from "@/lib/storage";
import { isCloudinaryEnabled, deleteBookAsset } from "@/lib/cloudinary";
import { getClientIp } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

async function requireAdminResponse(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminResponse(req);
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bookUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (updateData.publicationDate && typeof updateData.publicationDate === "string") {
    updateData.publicationDate = new Date(updateData.publicationDate);
  }

  const book = await prisma.book.update({
    where: { id },
    data: updateData as Parameters<typeof prisma.book.update>[0]["data"],
  });

  await logAction({
    action: "BOOK_UPDATE",
    actorId: admin.id,
    targetBookId: book.id,
    details: parsed.data,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ book });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminResponse(req);
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;

  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  try {
    if (isCloudinaryEnabled()) {
      await deleteBookAsset(book.fileStorageKey, "raw");
    } else {
      await fs.unlink(resolveSafeBookPath(book.fileStorageKey));
    }
  } catch {
    // Asset may already be gone; cascade DB delete is the authoritative action.
  }

  await prisma.book.delete({ where: { id } });

  await logAction({
    action: "BOOK_DELETE",
    actorId: admin.id,
    targetBookId: book.id,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
