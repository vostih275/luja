import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bookCreateSchema, validateFileSize, validateMimeType } from "@/lib/validation";
import { generateStorageKey, writeBookFile } from "@/lib/storage";
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

export async function GET(req: NextRequest) {
  const admin = await requireAdminResponse(req);
  if (admin instanceof NextResponse) return admin;
  const books = await prisma.book.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { permissions: true },
      },
    },
  });
  return NextResponse.json({ books });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminResponse(req);
  if (admin instanceof NextResponse) return admin;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Book file is required" }, { status: 400 });
  }

  const title = String(formData.get("title") ?? "");
  const author = String(formData.get("author") ?? "");
  const description = String(formData.get("description") ?? "");
  const publicationDateRaw = String(formData.get("publicationDate") ?? "");

  const parsed = bookCreateSchema.safeParse({
    title,
    author,
    description,
    publicationDate: publicationDateRaw,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    validateMimeType(file.type, "book");
    validateFileSize(file.size);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const key = generateStorageKey();
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeBookFile(key, buffer);

  const publicationDate = parsed.data.publicationDate
    ? new Date(parsed.data.publicationDate)
    : null;

  const book = await prisma.book.create({
    data: {
      title: parsed.data.title,
      author: parsed.data.author,
      description: parsed.data.description,
      publicationDate,
      fileStorageKey: key,
      mimeType: file.type,
      fileSizeBytes: file.size,
    },
  });

  await logAction({
    action: "BOOK_UPLOAD",
    actorId: admin.id,
    targetBookId: book.id,
    details: { mimeType: file.type, sizeBytes: file.size },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ book }, { status: 201 });
}
