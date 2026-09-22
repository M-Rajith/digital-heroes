"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Empty, Ball } from "@/components/ui";
import { fmtMoney, fmtDate, WINNER_STATUS_STYLE } from "@/lib/format";

export default function WinningsPage() {
  const [winners, setWinners] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api<any[]>("/winners/me").then(setWinners).catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function upload(winnerId: string, file: File) {
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api(`/winners/${winnerId}/proof`, { method: "POST", body: fd });
      setMsg("Proof uploaded — pending admin review.");
      load();
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  if (winners.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Winnings</h1>
        <Empty message="No winnings yet — keep entering your scores every round." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Winnings</h1>
      <p className="text-sm text-mist">
        Total won:{" "}
        <span className="font-mono font-bold text-mint">
          {fmtMoney(winners.reduce((a, w) => a + Number(w.amount), 0))}
        </span>
      </p>
      {msg && <p className="text-sm text-mint">{msg}</p>}
      {winners.map((w) => (
        <Card key={w.id}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Tier {w.tier} match · {fmtMoney(Number(w.amount))}</p>
              <p className="text-sm text-mist">Cycle {w.draw.cycleKey} · drawn {fmtDate(w.createdAt)}</p>
              <div className="mt-2 flex gap-1.5">
                {w.draw.winningNumbers?.map((n: number) => <Ball key={n} n={n} won />)}
              </div>
            </div>
            <div className="text-right">
              <span className={`badge ${WINNER_STATUS_STYLE[w.status]}`}>{w.status.replaceAll("_", " ")}</span>
              {w.status === "PENDING_VERIFICATION" && (
                <label className="mt-3 block cursor-pointer text-sm text-mint hover:underline">
                  {w.proof ? "Replace proof" : "Upload score screenshot"}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && upload(w.id, e.target.files[0])} />
                </label>
              )}
              {w.proof && <p className="mt-1 text-xs text-mist">Proof: {w.proof.status}</p>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
