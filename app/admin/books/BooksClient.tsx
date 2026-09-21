"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, Upload } from "lucide-react";

type BookRow = {
  id: string;
  title: string;
  author: string;
  mimeType: string;
  fileSizeBytes: number;
  publicationDate: string | null;
  createdAt: string;
  _count: { permissions: number };
};

export default function BooksClient({ initialBooks }: { initialBooks: BookRow[] }) {
  const [books, setBooks] = useState<BookRow[]>(initialBooks);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshBooks() {
    const res = await fetch("/api/admin/books");
    const data = await res.json();
    setBooks(data.books);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await fetch("/api/admin/books", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error ?? "Upload failed");
      return;
    }

    setMessage("Book uploaded successfully");
    form.reset();
    setShowForm(false);
    await refreshBooks();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">Books</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Upload book
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Title</label>
              <input
                name="title"
                required
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Author</label>
              <input
                name="author"
                required
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium text-slate-300">Description</label>
              <textarea
                name="description"
                required
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 placeholder:text-slate-500"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Publication date</label>
              <input
                name="publicationDate"
                type="datetime-local"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Book file (PDF or EPUB)</label>
              <input
                name="file"
                type="file"
                accept="application/pdf,application/epub+zip"
                required
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1 file:text-slate-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Cover image (optional)</label>
              <input
                name="coverImage"
                type="file"
                accept="image/*"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1 file:text-slate-50"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {loading ? "Uploading..." : "Upload"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-50"
            >
              Cancel
            </button>
          </div>
          {message && (
            <p className={`mt-3 text-sm ${message.includes("success") ? "text-green-400" : "text-red-400"}`}>
              {message}
            </p>
          )}
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/50 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Readers</th>
              <th className="px-4 py-3 font-medium">Added</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {books.map((book) => (
              <tr key={book.id} className="transition hover:bg-slate-800/50">
                <td className="px-4 py-3 text-slate-100">{book.title}</td>
                <td className="px-4 py-3 text-slate-400">{book.author}</td>
                <td className="px-4 py-3 text-slate-400">{book._count.permissions}</td>
                <td className="px-4 py-3 text-slate-400">{new Date(book.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/books/${book.id}`}
                    className="inline-flex items-center gap-1 text-indigo-400 transition hover:text-indigo-300"
                  >
                    <BookOpen className="h-4 w-4" />
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {books.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No books uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
