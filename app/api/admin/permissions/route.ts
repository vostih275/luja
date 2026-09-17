import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  const bookId = req.nextUrl.searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }

  const permissions = await prisma.permission.findMany({
    where: { bookId },
    include: { user: { select: { id: true, email: true } } },
  });

  const invitations = await prisma.invitation.findMany({
    where: { bookId, claimedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ permissions, invitations });
}
