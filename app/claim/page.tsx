"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

function ClaimForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Claim failed");
      return;
    }

    router.push("/library");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-slate-950 px-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-semibold text-slate-100">Accept your invitation</h1>
        <p className="mt-2 text-sm text-slate-400">
          Create a password to access your shared book.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
        <Link href="/login" className="mt-4 block text-center text-sm text-indigo-400 transition hover:text-indigo-300">
          Already have an account? Sign in
        </Link>
      </div>
    </main>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading invitation...</div>}>
      <ClaimForm />
    </Suspense>
  );
}
