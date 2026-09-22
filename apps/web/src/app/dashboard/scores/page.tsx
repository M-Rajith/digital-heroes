"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Empty } from "@/components/ui";
import { fmtDate } from "@/lib/format";

interface Score { id: string; value: number; date: string; }

export default function ScoresPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Score[]>("/scores").then(setScores).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const fd = new FormData(e.currentTarget);
    try {
      await api("/scores", {
        method: "POST",
        body: JSON.stringify({ value: Number(fd.get("value")), date: fd.get("date") }),
      });
      (e.target as HTMLFormElement).reset();
      setNotice("Score added. Only your latest 5 are kept — the oldest drops off automatically.");
      load();
    } catch (err: any) {
      const body = err?.body as any;
      setError(
        body?.message === "SCORE_DUPLICATE_DATE" ? "You already entered a score for that date."
        : body?.message === "SCORE_OUT_OF_RANGE" ? "Stableford scores must be between 1 and 45."
        : body?.message === "SUBSCRIPTION_REQUIRED" ? "An active subscription is required to enter scores."
        : err.message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api(`/scores/${id}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My scores</h1>

      <Card>
        <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row">
          <input name="value" type="number" min={1} max={45} required placeholder="Stableford (1–45)"
            className="input sm:w-48" />
          <input name="date" type="date" required className="input sm:w-48"
            defaultValue={new Date().toISOString().slice(0, 10)} />
          <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Add score"}</button>
        </form>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        {notice && <p className="mt-3 text-sm text-mint">{notice}</p>}
        <p className="mt-3 text-xs text-mist">One score per date. Range 1–45. Your newest 5 form your draw line.</p>
      </Card>

      {scores.length === 0 ? (
        <Empty message="No scores yet — add your first round above." />
      ) : (
        <div className="space-y-2">
          {scores.map((s, i) => (
            <div key={s.id}
              className="flex items-center justify-between rounded-xl border border-line bg-panel px-5 py-4">
              <div className="flex items-center gap-4">
                <span className="num-ball">{s.value}</span>
                <div>
                  <p className="font-semibold">{fmtDate(s.date)}</p>
                  {i === 0 && <p className="text-xs text-mint">Most recent</p>}
                </div>
              </div>
              <button onClick={() => remove(s.id)} className="text-sm text-mist hover:text-rose-300">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
