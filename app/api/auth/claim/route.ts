import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { invitationClaimSchema } from "@/lib/validation";
import { hashInviteToken } from "@/lib/invitations";
import { signSessionToken, setSessionCookie } from "@/lib/auth";
import { getClientIp } from "@/lib/rate-limit";
import { apiHandler } from "@/lib/api";

export const POST = apiHandler(async (req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = invitationClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { token, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account already exists for this email" },
      { status: 409 },
    );
  }

  const tokenHash = hashInviteToken(token);
  const now = new Date();

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
    include: { book: { select: { id: true, title: true } } },
  });

  if (!invitation || invitation.email !== email || invitation.expiresAt < now || invitation.claimedAt) {
    return NextResponse.json(
      { error: "Invitation is invalid, expired, or already used" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "READER",
      },
    });

    await tx.permission.create({
      data: {
        userId: newUser.id,
        bookId: invitation.bookId,
        grantedBy: newUser.id,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { claimedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        action: "INVITATION_CLAIMED",
        actorId: newUser.id,
        targetBookId: invitation.bookId,
        details: JSON.stringify({ email }),
        ipAddress: getClientIp(req),
      },
    });

    return newUser;
  });

  const sessionToken = await signSessionToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role },
    book: invitation.book,
  });
  return setSessionCookie(response, sessionToken);
});
