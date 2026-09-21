import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luja",
  description: "Secure book sharing",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30 antialiased">
        {children}
      </body>
    </html>
  );
}
