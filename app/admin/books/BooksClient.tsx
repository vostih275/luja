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
        <h1 className="text-2xl font-semibold">Books</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <Plus className="h-4 w-4" />
          Upload book
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Title</label>
              <input name="title" required className="w-full rounded-md border px-3 py-2" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Author</label>
              <input name="author" required className="w-full rounded-md border px-3 py-2" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                required
                className="w-full rounded-md border px-3 py-2"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Publication date</label>
              <input
                name="publicationDate"
                type="datetime-local"
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Book file (PDF or EPUB)</label>
              <input
                name="file"
                type="file"
                accept="application/pdf,application/epub+zip"
                required
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {loading ? "Uploading..." : "Upload"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
          {message && (
            <p className={`mt-3 text-sm ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          )}
        </form>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-neutral-100">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Readers</th>
              <th className="px-4 py-3 font-medium">Added</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} className="border-b last:border-0">
                <td className="px-4 py-3">{book.title}</td>
                <td className="px-4 py-3">{book.author}</td>
                <td className="px-4 py-3">{book._count.permissions}</td>
                <td className="px-4 py-3">{new Date(book.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/books/${book.id}`}
                    className="inline-flex items-center gap-1 text-neutral-700 hover:underline"
                  >
                    <BookOpen className="h-4 w-4" />
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {books.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
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
