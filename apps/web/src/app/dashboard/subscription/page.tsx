"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export default function SubscriptionPage() {
  const [sub, setSub] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      // PayPal redirect: ?paypal=success&token=<ORDER_ID>
      if (params.get("paypal") === "success" && params.get("token")) {
        try {
          setMsg("Confirming your payment…");
          await api("/subscriptions/paypal-capture", {
            method: "POST",
            body: JSON.stringify({ orderId: params.get("token") }),
          });
          setMsg("Payment confirmed — you are now an active subscriber.");
        } catch (e: any) {
          setMsg(`Payment confirmation failed: ${e.message}`);
        }
      }
      try {
        setSub(await api("/subscriptions/me"));
      } catch { /* not logged in or network error */ }
    })();
  }, [params]);

  const active = sub?.status === "ACTIVE";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscription</h1>

      {params.get("success") && (
        <Card className="border-white/25">
          <p className="text-white/90">Payment received — your subscription activates as soon as the payment provider confirms it (usually seconds).</p>
        </Card>
      )}
      {msg && (
        <Card className="border-white/25">
          <p className="text-white/90">{msg}</p>
        </Card>
      )}

      <Card>
        {sub ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">{sub.plan} plan</p>
              <span className={`badge ${active ? "border-white/25 bg-white/10 text-white" : "border-white/15 text-white/60"}`}>
                {sub.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-mist">Current period ends {fmtDate(sub.currentPeriodEnd)}</p>
          </>
        ) : (
          <p className="text-mist">No subscription yet.</p>
        )}
        <Link href="/pricing" className="btn-primary mt-4">
          {active ? "Extend / renew plan" : "Subscribe"}
        </Link>
      </Card>
    </div>
  );
}
