"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export default function SubscriptionPage() {
  const [sub, setSub] = useState<any>(null);
  const params = useSearchParams();
  const success = params.get("success");

  useEffect(() => { api("/subscriptions/me").then(setSub).catch(() => {}); }, []);

  const active = sub?.status === "ACTIVE";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscription</h1>
      {success && (
        <Card className="border-mint/40">
          <p className="text-mint">Payment received — your subscription will activate as soon as Stripe confirms it (usually seconds).</p>
        </Card>
      )}
      <Card>
        {sub ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">{sub.plan} plan</p>
              <span className={`badge ${active ? "border-mint/40 bg-mint/10 text-mint" : "border-amber-500/40 bg-amber-500/10 text-amber-300"}`}>
                {sub.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-mist">Current period ends {fmtDate(sub.currentPeriodEnd)}</p>
          </>
        ) : (
          <p className="text-mist">No subscription yet.</p>
        )}
        <Link href="/pricing" className="btn-primary mt-4">
          {active ? "Change plan" : "Subscribe"}
        </Link>
      </Card>
    </div>
  );
}
