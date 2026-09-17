import z from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";

const revokeSchema = z.object({
  bookId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  email: z
    .email()
    .transform((v) => v.trim().toLowerCase())
    .optional(),
});

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

export async function POST(req: NextRequest) {
  const admin = await requireAdminResponse(req);
  if (admin instanceof NextResponse) return admin;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { bookId, userId, email } = parsed.data;
  if (!userId && !email) {
    return NextResponse.json(
      { error: "Either userId or email is required" },
      { status: 400 },
    );
  }

  if (userId) {
    const { count } = await prisma.permission.deleteMany({
      where: { userId, bookId },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    }
    await logAction({
      action: "PERMISSION_REVOKE",
      actorId: admin.id,
      targetUserId: userId,
      targetBookId: bookId,
      ipAddress: getClientIp(req),
    });
  } else if (email) {
    const { count } = await prisma.invitation.deleteMany({
      where: { email, bookId },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    await logAction({
      action: "PERMISSION_REVOKE",
      actorId: admin.id,
      targetBookId: bookId,
      details: { email },
      ipAddress: getClientIp(req),
    });
  }

  return NextResponse.json({ ok: true });
}
