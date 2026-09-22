"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const link =
    "text-sm text-white/70 transition-colors duration-200 hover:text-white";
  const pill =
    "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-black/60 backdrop-blur-2xl backdrop-saturate-150"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="font-display text-[17px] font-semibold tracking-tight">
          digital<span className="text-white/40">·</span>heroes
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <Link className={link} href="/how-it-works">How it works</Link>
          <Link className={link} href="/charities">Charities</Link>
          <Link className={link} href="/pricing">Pricing</Link>
          <Link className={link} href="/draws">Draws</Link>
        </div>

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <Link
                href={user.role === "ADMIN" ? "/admin" : "/dashboard"}
                className={`${pill} bg-white text-black hover:bg-white/85`}
              >
                {user.role === "ADMIN" ? "Admin" : "Dashboard"}
              </Link>
              <button
                onClick={logout}
                className={`${pill} border border-white/15 text-white/70 hover:border-white/30 hover:text-white`}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`${pill} text-white/75 hover:text-white`}>
                Sign in
              </Link>
              <Link href="/pricing" className={`${pill} bg-white text-black hover:bg-white/85`}>
                Subscribe
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
