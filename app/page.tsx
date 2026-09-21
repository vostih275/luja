"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Eye, Shield, Cloud } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <Image
              alt="Luja Logo"
              className="h-8 w-auto object-contain"
              height={40}
              priority
              src="/logo.png"
              width={120}
            />
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/admin" className="text-slate-400 transition hover:text-slate-50">
              Admin Portal
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-slate-700 px-4 py-2 text-slate-50 transition hover:border-indigo-500 hover:text-indigo-400"
            >
              Sign In
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-3xl space-y-8"
          >
            <span className="inline-block rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Private Access
            </span>

            <h1 className="font-serif text-5xl font-bold leading-tight md:text-6xl">
              The secure vault for your exclusive books.
            </h1>

            <p className="mx-auto max-w-xl text-lg text-slate-400">
              Experience a private digital library with zero-footprint browser
              reading and strict invitation-only access control.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/claim"
                className="rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
              >
                Claim Invitation
              </Link>
              <Link
                href="/library"
                className="rounded-md border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-50 transition hover:border-indigo-500 hover:text-indigo-400"
              >
                Access Library
              </Link>
            </div>
          </motion.div>
        </section>

        <section className="border-y border-slate-800 bg-slate-900/40 px-6 py-20">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {[
              {
                icon: Eye,
                title: "Zero-Footprint Reading",
                desc: "Read directly in your browser. No downloads required.",
              },
              {
                icon: Shield,
                title: "Bank-Grade Privacy",
                desc: "Strict access control. Only authorized readers can view shared titles.",
              },
              {
                icon: Cloud,
                title: "Cloud Synced",
                desc: "Your library is always available, securely hosted with instant revocation.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease: "easeOut" }}
                className="rounded-lg border border-slate-800 bg-slate-950 p-6"
              >
                <feature.icon className="mb-4 h-8 w-8 text-indigo-400" />
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 px-6 py-6 text-center text-sm text-slate-500">
        © 2026 Luja
      </footer>
    </div>
  );
}
