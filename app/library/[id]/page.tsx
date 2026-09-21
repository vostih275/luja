import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ReaderPage from "./ReaderPage";

export default async function ReaderBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const permitted =
    user.role === "ADMIN" ||
    !!(await prisma.permission.findUnique({
      where: { userId_bookId: { userId: user.id, bookId: id } },
    }));

  if (!permitted) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-12 text-center">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-2xl font-semibold text-slate-100">Access Restricted</h1>
          <p className="mt-2 text-slate-400">
            You do not have permission to view this book. If access was revoked,
            contact the administrator.
          </p>
        </div>
      </main>
    );
  }

  const book = await prisma.book.findUnique({
    where: { id },
    select: { id: true, title: true, mimeType: true },
  });
  if (!book) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-12 text-center">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-2xl font-semibold text-slate-100">Book not found</h1>
        </div>
      </main>
    );
  }

  return <ReaderPage book={book} fileUrl={`/api/books/${book.id}/file`} />;
}
