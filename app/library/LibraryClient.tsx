"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, LogOut } from "lucide-react";

type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  coverImageUrl: string | null;
  publicationDate: string | null;
  mimeType: string;
  fileSizeBytes: number;
};

type User = { email: string; role: string };

export default function LibraryClient({
  user,
  initialBooks,
}: {
  user: User;
  initialBooks: Book[];
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Luja logo" width={32} height={32} priority />
            <h1 className="text-xl font-semibold text-slate-100">My Library</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-100">{user.email}</p>
              <p className="text-xs text-slate-400">{user.role.toLowerCase()}</p>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-50 transition hover:border-indigo-500 hover:text-indigo-400"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        {initialBooks.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-slate-600" />
            <h2 className="mt-4 text-lg font-medium text-slate-100">No books shared with you yet</h2>
            <p className="mt-2 text-sm text-slate-400">
              When an admin grants you access, books will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {initialBooks.map((book) => (
              <Link
                key={book.id}
                href={`/library/${book.id}`}
                className="group rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700 hover:bg-slate-800/50"
              >
                <div className="relative flex h-40 items-center justify-center rounded-md bg-slate-800">
                  {book.coverImageUrl ? (
                    <Image
                      src={book.coverImageUrl}
                      alt={book.title}
                      fill
                      className="rounded-md object-cover"
                    />
                  ) : (
                    <BookOpen className="h-12 w-12 text-slate-500" />
                  )}
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-100">{book.title}</h2>
                <p className="text-sm text-slate-400">{book.author}</p>
                <p className="mt-2 line-clamp-3 text-sm text-slate-300">{book.description}</p>
                {book.publicationDate && (
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(book.publicationDate).toLocaleDateString()}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
