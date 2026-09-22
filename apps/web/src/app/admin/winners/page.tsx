"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Empty } from "@/components/ui";
import { fmtMoney, WINNER_STATUS_STYLE } from "@/lib/format";

export default function AdminWinners() {
  const [winners, setWinners] = useState<any[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<any[]>("/admin/winners").then(setWinners).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function act(id: string, action: "verify" | "payout", approve?: boolean) {
    setError("");
    try {
      await api(`/admin/winners/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify(action === "verify" ? { approve } : {}),
      });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (winners.length === 0) return <Empty message="No winners yet. Publish a draw to generate them." />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Winners</h1>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <div className="space-y-3">
        {winners.map((w) => (
          <Card key={w.id}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold">
                  {w.user?.name ?? w.user?.email} · Tier {w.tier} · {fmtMoney(Number(w.amount))}
                </p>
                <p className="text-sm text-mist">Cycle {w.draw.cycleKey}</p>
                {w.proof && (
                  <a href={w.proof.fileUrl} target="_blank" rel="noreferrer"
                    className="mt-1 inline-block text-sm text-mint hover:underline">
                    View proof ({w.proof.status}) →
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${WINNER_STATUS_STYLE[w.status]}`}>{w.status.replaceAll("_", " ")}</span>
                {w.status === "PENDING_VERIFICATION" && w.proof && (
                  <>
                    <button onClick={() => act(w.id, "verify", true)} className="btn-primary !px-3 !py-1.5 text-sm">Approve</button>
                    <button onClick={() => act(w.id, "verify", false)} className="btn-ghost !px-3 !py-1.5 text-sm">Reject</button>
                  </>
                )}
                {w.status === "VERIFIED" && (
                  <button onClick={() => act(w.id, "payout")} className="btn-primary !px-3 !py-1.5 text-sm">
                    Mark paid
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
