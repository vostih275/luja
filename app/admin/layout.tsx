import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getServerUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen gap-6 p-6">
      <aside className="w-60 shrink-0 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-6 px-2">
          <p className="text-sm font-medium text-neutral-500">Admin</p>
          <p className="text-sm text-neutral-900">{user.email}</p>
        </div>
        <nav className="flex flex-col gap-2">
          <Link
            href="/admin/books"
            className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Books
          </Link>
          <Link
            href="/admin/audit"
            className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Audit Logs
          </Link>
          <Link
            href="/library"
            className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Reader View
          </Link>
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
