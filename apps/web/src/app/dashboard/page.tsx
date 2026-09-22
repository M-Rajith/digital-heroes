"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, Empty } from "@/components/ui";
import { fmtDate, fmtMoney } from "@/lib/format";

export default function DashboardHome() {
  const [me, setMe] = useState<any>(null);
  const [current, setCurrent] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api("/users/me").then(setMe).catch((e) => setError(e.message)),
      api("/draws/current", { auth: false }).then(setCurrent).catch(() => {}),
    ]);
  }, []);

  if (error) return <Empty message={`Could not load your profile: ${error}`} />;
  if (!me) return <Empty message="Loading…" />;

  const sub = me.subscription;
  const active = sub?.status === "ACTIVE" && (!sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hello, {me.name ?? me.email}</h1>
        <span className={`badge ${active ? "border-mint/40 bg-mint/10 text-mint" : "border-amber-500/40 bg-amber-500/10 text-amber-300"}`}>
          {active ? "Active subscriber" : "Subscription required"}
        </span>
      </div>

      {!active && (
        <Card className="border-amber-500/30">
          <p className="font-semibold text-amber-300">Your subscription is inactive.</p>
          <p className="mt-1 text-sm text-mist">Resubscribe to enter scores and join this month&apos;s draw.</p>
          <Link href="/pricing" className="btn-primary mt-4">View plans</Link>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="text-sm text-mist">Plan</p>
          <p className="mt-1 font-semibold">{sub ? `${sub.plan} · ${sub.status}` : "None"}</p>
          <p className="mt-1 text-sm text-mist">Renews {fmtDate(sub?.currentPeriodEnd)}</p>
        </Card>
        <Card>
          <p className="text-sm text-mist">Latest scores</p>
          <p className="mt-1 font-semibold">{me.scores?.length ?? 0} / 5 entered</p>
          <Link href="/dashboard/scores" className="mt-1 inline-block text-sm text-mint hover:underline">Manage →</Link>
        </Card>
        <Card>
          <p className="text-sm text-mist">Charity</p>
          <p className="mt-1 font-semibold">{me.charitySelection?.charity?.name ?? "Not selected"}</p>
          <p className="mt-1 text-sm text-mist">{me.charitySelection?.percentage ?? 0}% of your fee</p>
        </Card>
        <Card>
          <p className="text-sm text-mist">This month&apos;s pool</p>
          <p className="mt-1 font-display text-2xl font-bold text-gold">
            {current?.estimatedPool != null ? fmtMoney(Number(current.estimatedPool)) : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-mist">Draw cycle</p>
          <p className="mt-1 font-semibold">{current?.draw?.cycleKey ?? "Starting soon"}</p>
          <p className="mt-1 text-sm text-mist">{current?.activeSubscribers ?? 0} active subscribers</p>
        </Card>
        <Card>
          <p className="text-sm text-mist">Lifetime winnings</p>
          <p className="mt-1 font-display text-2xl font-bold text-mint">
            {fmtMoney(me.winners?.reduce((a: number, w: any) => a + Number(w.amount), 0) ?? 0)}
          </p>
          <Link href="/dashboard/winnings" className="mt-1 inline-block text-sm text-mint hover:underline">Details →</Link>
        </Card>
      </div>
    </div>
  );
}
