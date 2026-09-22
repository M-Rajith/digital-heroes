"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const tabs = [
  ["Overview", "/admin"],
  ["Users", "/admin/users"],
  ["Draws", "/admin/draws"],
  ["Charities", "/admin/charities"],
  ["Winners", "/admin/winners"],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading) return <p className="py-24 text-center text-mist">Loading…</p>;
  if (!user || user.role !== "ADMIN") {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:flex-row">
      <aside className="md:w-52 md:shrink-0">
        <p className="mb-3 hidden px-4 text-xs font-bold uppercase tracking-[0.25em] text-mist md:block">
          Admin
        </p>
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {tabs.map(([label, href]) => (
            <Link key={href} href={href}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm transition ${
                pathname === href ? "bg-mint/10 font-semibold text-mint" : "text-mist hover:text-slate-100"
              }`}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}
