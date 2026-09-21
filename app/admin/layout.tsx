import Link from "next/link";
import Image from "next/image";
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
    <div className="flex min-h-screen gap-6 bg-slate-950 p-6 text-slate-50">
      <aside className="w-60 shrink-0 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-6 px-2 text-center">
          <Image src="/logo.png" alt="Luja logo" width={64} height={64} priority className="mx-auto" />
          <p className="mt-3 text-sm font-medium text-slate-400">Admin</p>
          <p className="text-sm text-slate-100">{user.email}</p>
        </div>
        <nav className="flex flex-col gap-2">
          <Link
            href="/admin/books"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-50"
          >
            Books
          </Link>
          <Link
            href="/admin/audit"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-50"
          >
            Audit Logs
          </Link>
          <Link
            href="/library"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-50"
          >
            Reader View
          </Link>
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
