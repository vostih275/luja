import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import LibraryClient from "./LibraryClient";

export default async function LibraryPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
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

  const books = permissions.map((p) => ({
    ...p.book,
    publicationDate: p.book.publicationDate?.toISOString() ?? null,
  }));

  return <LibraryClient user={{ email: user.email, role: user.role }} initialBooks={books} />;
}
