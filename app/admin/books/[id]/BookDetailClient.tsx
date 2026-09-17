"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Save, UserPlus, Users, Mail } from "lucide-react";

type PermissionRow = { id: string; user: { id: string; email: string } };
type InvitationRow = { id: string; email: string; expiresAt: string; claimedAt: string | null };
type BookRow = {
  id: string;
  title: string;
  author: string;
  description: string;
  publicationDate: string | null;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export default function BookDetailClient({
  book,
  initialPermissions,
  initialInvitations,
}: {
  book: BookRow;
  initialPermissions: PermissionRow[];
  initialInvitations: InvitationRow[];
}) {
  const router = useRouter();
  const [permissions, setPermissions] = useState<PermissionRow[]>(initialPermissions);
  const [invitations, setInvitations] = useState<InvitationRow[]>(initialInvitations);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<BookRow>(book);
  const [grantEmail, setGrantEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function updateBook(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/admin/books/${book.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: formData.title,
        author: formData.author,
        description: formData.description,
        publicationDate: formData.publicationDate,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Update failed");
      return;
    }
    setMessage("Book updated");
    setEditMode(false);
  }

  async function grantAccess(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setInviteLink(null);
    const res = await fetch("/api/admin/permissions/grant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookId: book.id, email: grantEmail }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Grant failed");
      return;
    }
    if (data.inviteToken) {
      setInviteLink(`/invite/${data.inviteToken}`);
      setMessage("Invitation created. Share the link below.");
      setInvitations((prev) => [
        ...prev,
        { id: data.expiresAt, email: grantEmail, expiresAt: data.expiresAt, claimedAt: null },
      ]);
    } else {
      setMessage("Access granted");
      const permRes = await fetch(`/api/admin/permissions?bookId=${book.id}`);
      if (permRes.ok) {
        const permData = await permRes.json();
        setPermissions(permData.permissions);
      }
    }
    setGrantEmail("");
  }

  async function revokePermission(userId: string) {
    const res = await fetch("/api/admin/permissions/revoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookId: book.id, userId }),
    });
    if (res.ok) {
      setPermissions((prev) => prev.filter((p) => p.user.id !== userId));
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Revoke failed");
    }
  }

  async function revokeInvitation(email: string) {
    const res = await fetch("/api/admin/permissions/revoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookId: book.id, email }),
    });
    if (res.ok) {
      setInvitations((prev) => prev.filter((i) => i.email !== email));
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Revoke failed");
    }
  }

  async function deleteBook() {
    if (!confirm("Delete this book and all access records?")) return;
    const res = await fetch(`/api/admin/books/${book.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/books");
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{book.title}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setEditMode((v) => !v)}
            className="rounded-md border px-4 py-2 text-sm"
          >
            {editMode ? "Cancel" : "Edit"}
          </button>
          <button
            onClick={deleteBook}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {editMode ? (
        <form onSubmit={updateBook} className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="grid gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Title</label>
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Author</label>
              <input
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-md border px-3 py-2"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Publication date</label>
              <input
                type="datetime-local"
                value={formData.publicationDate ?? ""}
                onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value || null })}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </form>
      ) : (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-500">{book.author}</p>
          <p className="mt-2 text-neutral-700">{book.description}</p>
          <p className="mt-2 text-sm text-neutral-500">
            {book.mimeType} · {(book.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}

      <form onSubmit={grantAccess} className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-medium">
          <UserPlus className="h-5 w-5" />
          Grant access
        </h2>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="reader@example.com"
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
            required
            className="flex-1 rounded-md border px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Grant
          </button>
        </div>
        {inviteLink && (
          <div className="mt-3 rounded-md bg-neutral-100 p-3 text-sm">
            <p className="font-medium">Invitation link (single-use, 7 days):</p>
            <code className="mt-1 block break-all text-blue-700">{window.location.origin}{inviteLink}</code>
          </div>
        )}
      </form>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-medium">
          <Users className="h-5 w-5" />
          Readers with access
        </h2>
        {permissions.length === 0 ? (
          <p className="text-sm text-neutral-500">No readers yet.</p>
        ) : (
          <ul className="divide-y">
            {permissions.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="text-sm">{p.user.email}</span>
                <button
                  onClick={() => revokePermission(p.user.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-medium">
          <Mail className="h-5 w-5" />
          Pending invitations
        </h2>
        {invitations.length === 0 ? (
          <p className="text-sm text-neutral-500">No pending invitations.</p>
        ) : (
          <ul className="divide-y">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between py-2">
                <span className="text-sm">{inv.email} · expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                <button
                  onClick={() => revokeInvitation(inv.email)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {message && (
        <p className={`text-sm ${message.includes("successfully") || message.includes("granted") || message.includes("created") || message.includes("updated") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
