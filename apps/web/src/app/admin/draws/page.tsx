"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Empty, Ball } from "@/components/ui";
import { fmtMoney } from "@/lib/format";

export default function AdminDraws() {
  const [current, setCurrent] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = () => api("/draws/current", { auth: false }).then(setCurrent).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  async function act(action: string) {
    setBusy(action); setError(""); setResult(null);
    try {
      if (action === "create") {
        const cycleKey = new Date().toISOString().slice(0, 7);
        await api("/admin/draws", { method: "POST", body: JSON.stringify({ cycleKey, type: "RANDOM" }) });
      } else {
        const drawId = current.draw.id;
        const res = await api(`/admin/draws/${drawId}/${action}`, { method: "POST", body: JSON.stringify({}) });
        setResult(res);
      }
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Draw management</h1>
      {!current?.draw ? (
        <Card>
          <p className="text-mist">No draw cycle exists for this month.</p>
          <button onClick={() => act("create")} className="btn-primary mt-4" disabled={!!busy}>
            Create this month&apos;s cycle
          </button>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-xl font-bold">{current.draw.cycleKey}</p>
              <p className="text-sm text-mist">
                {current.draw.type} · {current.draw.status} · {current.draw._count?.entries ?? 0} entries
                {current.draw.winningNumbers?.length > 0 && (
                  <span className="ml-3 inline-flex gap-1 align-middle">
                    {current.draw.winningNumbers.map((n: number) => <Ball key={n} n={n} won />)}
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-mist">
                Est. pool {fmtMoney(Number(current.estimatedPool))} · jackpot {fmtMoney(Number(current.jackpot))}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => act("simulate")} className="btn-ghost" disabled={!!busy || current.draw.status === "PUBLISHED"}>
                {busy === "simulate" ? "Running…" : "Simulate"}
              </button>
              <button onClick={() => act("publish")} className="btn-primary" disabled={!!busy || current.draw.status === "PUBLISHED"}>
                {busy === "publish" ? "Publishing…" : "Publish results"}
              </button>
            </div>
          </div>
        </Card>
      )}
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {result && (
        <Card className="border-mint/30">
          <p className="font-semibold text-mint">Result</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-ink p-4 text-xs text-mist">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
      <Empty message="Simulations never persist final results. Publishing runs freeze → draw → match → allocate → winners in one transaction, with full audit logging." />
    </div>
  );
}
