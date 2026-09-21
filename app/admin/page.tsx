import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireServerAdmin } from "@/lib/auth";
import { BookOpen, Users, Mail, HardDrive, Activity, ArrowRight } from "lucide-react";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
}

export default async function AdminDashboardPage() {
  let admin;
  try {
    admin = await requireServerAdmin();
  } catch {
    redirect("/login");
  }

  const [totalBooks, activeReaders, pendingInvites, storageAgg, recentLogs] = await Promise.all([
    prisma.book.count().catch(() => 0),
    prisma.user.count({ where: { role: "READER" } }).catch(() => 0),
    prisma.invitation.count({ where: { claimedAt: null } }).catch(() => 0),
    prisma.book
      .aggregate({ _sum: { fileSizeBytes: true } })
      .then((r) => r._sum.fileSizeBytes ?? 0)
      .catch(() => 0),
    prisma.auditLog
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { actor: { select: { email: true } } },
      })
      .catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-400">Overview of the Luja secure vault</p>
        </div>
        <p className="text-sm text-slate-400">
          Signed in as <span className="font-medium text-slate-100">{admin.email}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <p className="text-sm text-slate-400">Total Books</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-100">{totalBooks}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-indigo-400" />
            <p className="text-sm text-slate-400">Active Readers</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-100">{activeReaders}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-indigo-400" />
            <p className="text-sm text-slate-400">Pending Invites</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-100">{pendingInvites}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-indigo-400" />
            <p className="text-sm text-slate-400">Storage Used</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-100">{formatBytes(storageAgg)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-100">Recent Activity</h2>
          </div>
          <Link
            href="/admin/audit"
            className="inline-flex items-center gap-1 text-sm text-indigo-400 transition hover:text-indigo-300"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recentLogs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Actor</th>
                  <th className="pb-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50">
                    <td className="py-3 text-slate-100">{log.action}</td>
                    <td className="py-3 text-slate-400">{log.actor?.email ?? "system"}</td>
                    <td className="py-3 text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
