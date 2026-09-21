import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiHandler } from "@/lib/api";

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await prisma.permission.findMany({
    where: { userId: user.id },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          description: true,
          coverImageUrl: true,
          publicationDate: true,
          mimeType: true,
          fileSizeBytes: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const books = permissions.map((p) => p.book);
  return NextResponse.json({ books });
});
