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
      <main className="mx-auto max-w-2xl p-12 text-center">
        <h1 className="text-2xl font-semibold">Access Restricted</h1>
        <p className="mt-2 text-neutral-600">
          You do not have permission to view this book. If access was revoked,
          contact the administrator.
        </p>
        <Link
          href="/library"
          className="mt-6 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Back to library
        </Link>
      </main>
    );
  }

  const book = await prisma.book.findUnique({
    where: { id },
    select: { id: true, title: true, mimeType: true, fileSizeBytes: true },
  });
  if (!book) {
    return (
      <main className="mx-auto max-w-2xl p-12 text-center">
        <h1 className="text-2xl font-semibold">Book not found</h1>
        <Link href="/library" className="mt-4 inline-block text-neutral-700 hover:underline">
          Back to library
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{book.title}</h1>
        <div className="flex gap-2">
          <Link
            href={`/api/books/${book.id}/file`}
            target="_blank"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Open / Download
          </Link>
          <Link
            href="/library"
            className="rounded-md border px-4 py-2 text-sm"
          >
            Back
          </Link>
        </div>
      </div>
      {book.mimeType === "application/pdf" ? (
        <iframe
          src={`/api/books/${book.id}/file`}
          className="h-[80vh] w-full rounded-lg border"
          title={book.title}
        />
      ) : (
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-neutral-600">
            This book format is not previewable in the browser. Use the
            <Link href={`/api/books/${book.id}/file`} className="mx-1 font-medium text-blue-700 hover:underline">
              download link
            </Link>
            to open it.
          </p>
        </div>
      )}
    </main>
  );
}
