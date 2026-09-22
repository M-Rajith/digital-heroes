"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Empty, Ball } from "@/components/ui";

export default function DrawsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);

  useEffect(() => {
    api<any[]>("/draws/my-entries").then(setEntries).catch(() => {});
    api("/draws/current", { auth: false }).then(setCurrent).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Draws</h1>
      {current?.draw && (
        <Card className="border-mint/30">
          <p className="text-sm text-mist">Current cycle</p>
          <p className="font-display text-xl font-bold">{current.draw.cycleKey}</p>
          <p className="mt-1 text-sm text-mist">
            Est. pool {current.estimatedPool != null ? `$${Number(current.estimatedPool).toFixed(2)}` : "—"}
            {" · "}{current.activeSubscribers} subscribers · status {current.draw.status}
          </p>
        </Card>
      )}
      {entries.length === 0 ? (
        <Empty message="You're not in any draw yet — your entry is created automatically from your latest 5 scores each month." />
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Card key={e.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">Cycle {e.draw.cycleKey}</p>
                <div className="flex gap-1.5">
                  {e.numbers.map((n: number) => {
                    const won = e.draw.status === "PUBLISHED" && e.draw.winningNumbers?.includes(n);
                    return <Ball key={n} n={n} won={won} />;
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
