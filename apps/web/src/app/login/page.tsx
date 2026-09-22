"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await login(String(fd.get("email")), String(fd.get("password")));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Sign in failed");
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-sm px-4 py-24">
      <Card>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input name="email" type="email" required placeholder="Email" className="input" />
          <input name="password" type="password" required placeholder="Password" className="input" />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="mt-4 text-center text-sm text-mist">
          New here? <Link href="/signup" className="text-mint hover:underline">Create an account</Link>
        </p>
      </Card>
    </section>
  );
}
