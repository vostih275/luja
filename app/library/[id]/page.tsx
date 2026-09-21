import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
          <Link
            href="/library"
            className="mt-6 inline-block rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
          >
            Back to library
          </Link>
        </div>
      </main>
    );
  }

  const book = await prisma.book.findUnique({
    where: { id },
    select: { id: true, title: true, mimeType: true, fileSizeBytes: true },
  });
  if (!book) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-12 text-center">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-2xl font-semibold text-slate-100">Book not found</h1>
          <Link href="/library" className="mt-4 inline-block text-indigo-400 transition hover:text-indigo-300">
            Back to library
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-50">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-100">{book.title}</h1>
          <div className="flex gap-2">
            <Link
              href={`/api/books/${book.id}/file`}
              target="_blank"
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
            >
              Open / Download
            </Link>
            <Link
              href="/library"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-50 transition hover:border-slate-500"
            >
              Back
            </Link>
          </div>
        </div>
        {book.mimeType === "application/pdf" ? (
          <iframe
            src={`/api/books/${book.id}/file`}
            className="h-[80vh] w-full rounded-xl border border-slate-800"
            title={book.title}
          />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <p className="text-slate-300">
              This book format is not previewable in the browser. Use the
              <Link href={`/api/books/${book.id}/file`} className="mx-1 font-medium text-indigo-400 transition hover:text-indigo-300">
                download link
              </Link>
              to open it.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
