import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { accessGrantSchema } from "@/lib/validation";
import { generateInviteToken, hashInviteToken, addDays } from "@/lib/invitations";
import { getClientIp } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { apiHandler } from "@/lib/api";

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

export const POST = apiHandler(async (req: NextRequest) => {
  const admin = await requireAdminResponse(req);
  if (admin instanceof NextResponse) return admin;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = accessGrantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, bookId } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    await prisma.permission.upsert({
      where: {
        userId_bookId: {
          userId: existingUser.id,
          bookId,
        },
      },
      update: {},
      create: {
        userId: existingUser.id,
        bookId,
        grantedBy: admin.id,
      },
    });

    await logAction({
      action: "PERMISSION_GRANT",
      actorId: admin.id,
      targetUserId: existingUser.id,
      targetBookId: bookId,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ granted: true });
  }

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = addDays(new Date(), 7);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      bookId,
      tokenHash,
      expiresAt,
    },
  });

  await logAction({
    action: "INVITATION_CREATED",
    actorId: admin.id,
    targetBookId: bookId,
    details: { email },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    inviteToken: rawToken,
    expiresAt: invitation.expiresAt.toISOString(),
  });
});
