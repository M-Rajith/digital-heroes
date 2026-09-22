"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui";

export default function Signup() {
  const { signup } = useAuth();
  const router = useRouter();
  const [charities, setCharities] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<any[]>("/charities", { auth: false }).then(setCharities).catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await signup({
        email: String(fd.get("email")),
        password: String(fd.get("password")),
        name: String(fd.get("name") || "") || undefined,
        charityId: String(fd.get("charityId") || "") || undefined,
        charityPercentage: Number(fd.get("percentage") || 10),
      });
      router.push("/pricing");
    } catch (err: any) {
      setError(err?.message ?? "Signup failed");
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-24">
      <Card>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-mist">Start giving from your very first payment.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input name="name" placeholder="Name (optional)" className="input" />
          <input name="email" type="email" required placeholder="Email" className="input" />
          <input name="password" type="password" required minLength={8} placeholder="Password (8+ chars)" className="input" />
          <select name="charityId" className="input" defaultValue="">
            <option value="">Choose a charity (optional for now)</option>
            {charities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div>
            <label className="text-sm text-mist">Charity contribution (min 10%)</label>
            <input name="percentage" type="number" min={10} max={100} defaultValue={10} className="input mt-1" />
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        </form>
        <p className="mt-4 text-center text-sm text-mist">
          Already registered? <Link href="/login" className="text-mint hover:underline">Sign in</Link>
        </p>
      </Card>
    </section>
  );
}
