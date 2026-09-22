"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, SectionTitle, FadeIn } from "@/components/ui";

const plans = [
  { key: "monthly", name: "Monthly", price: "$9.99", per: "/month", points: ["Full platform access", "Monthly prize draws", "≥10% to your charity"] },
  { key: "yearly", name: "Yearly", price: "$99.90", per: "/year", points: ["2 months free", "All Monthly features", "Priority winner support"], hot: true },
];

export default function Pricing() {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function subscribe(plan: string) {
    setError("");
    if (!user) return router.push("/signup");
    setBusy(plan);
    try {
      const { checkoutUrl } = await api<{ checkoutUrl: string }>("/subscriptions/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      window.location.href = checkoutUrl;
    } catch (e: any) {
      setError(e?.message ?? "Could not start checkout");
      setBusy(null);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-20">
      <SectionTitle kicker="Pricing" title="One plan. Two rhythms."
        sub="Cancel anytime. A fixed share of every payment funds the prize pool — at least 10% goes to charity." />
      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((p, i) => (
          <FadeIn key={p.key} delay={i * 0.1}>
            <Card className={`h-full ${p.hot ? "border-mint/40" : ""}`}>
              {p.hot && <span className="badge border-mint/40 bg-mint/10 text-mint">Best value</span>}
              <h3 className="mt-2 text-xl font-bold">{p.name}</h3>
              <p className="mt-2">
                <span className="font-display text-4xl font-bold">{p.price}</span>
                <span className="text-mist"> {p.per}</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-mist">
                {p.points.map((pt) => <li key={pt}>✓ {pt}</li>)}
              </ul>
              <button
                className="btn-primary mt-6 w-full"
                disabled={busy !== null}
                onClick={() => subscribe(p.key)}
              >
                {busy === p.key ? "Redirecting…" : `Subscribe ${p.name.toLowerCase()}`}
              </button>
            </Card>
          </FadeIn>
        ))}
      </div>
      {error && <p className="mt-6 text-center text-sm text-rose-300">{error}</p>}
    </section>
  );
}
