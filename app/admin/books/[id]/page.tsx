import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import BookDetailClient from "./BookDetailClient";

export default async function AdminBookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login");
  }

  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    redirect("/admin/books");
  }

  const permissions = await prisma.permission.findMany({
    where: { bookId: id },
    include: { user: { select: { id: true, email: true } } },
  });

  const invitations = await prisma.invitation.findMany({
    where: { bookId: id, claimedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <BookDetailClient
      book={{
        ...book,
        createdAt: book.createdAt.toISOString(),
        updatedAt: book.updatedAt.toISOString(),
        publicationDate: book.publicationDate?.toISOString() ?? null,
      }}
      initialPermissions={permissions.map((p) => ({
        id: p.id,
        user: { id: p.user.id, email: p.user.email },
      }))}
      initialInvitations={invitations.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
        claimedAt: i.claimedAt?.toISOString() ?? null,
      }))}
    />
  );
}
