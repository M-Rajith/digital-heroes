"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const tabs = [
  ["Overview", "/dashboard"],
  ["My scores", "/dashboard/scores"],
  ["Subscription", "/dashboard/subscription"],
  ["My charity", "/dashboard/charity"],
  ["Draws", "/dashboard/draws"],
  ["Winnings", "/dashboard/winnings"],
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading) return <p className="py-24 text-center text-mist">Loading…</p>;
  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
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
