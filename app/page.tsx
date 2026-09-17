import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Luja</h1>
      <p className="text-neutral-600">
        Secure book sharing with per-reader access control.
      </p>
      <Link
        href="/login"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Sign in
      </Link>
    </main>
  );
}
