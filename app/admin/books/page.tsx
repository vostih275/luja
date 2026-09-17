import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import BooksClient from "./BooksClient";

export default async function AdminBooksPage() {
  const user = await getServerUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login");
  }

  const books = await prisma.book.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { permissions: true },
      },
    },
  });

  const serialized = books.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    publicationDate: b.publicationDate?.toISOString() ?? null,
  }));

  return <BooksClient initialBooks={serialized} />;
}
