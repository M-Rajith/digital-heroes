"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, Empty } from "@/components/ui";
import { fmtMoney } from "@/lib/format";

export default function AdminHome() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api("/admin/analytics").then(setData).catch(() => {}); }, []);

  if (!data) return <Empty message="Loading analytics…" />;

  const stat = (label: string, value: React.ReactNode) => (
    <Card>
      <p className="text-sm text-mist">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat("Total users", data.totals.totalUsers)}
        {stat("Active subscribers", data.totals.activeSubscribers)}
        {stat("Lapsed subscriptions", data.totals.lapsedSubscriptions)}
        {stat("Total collected", fmtMoney(Number(data.revenue.totalCollected)))}
        {stat("Estimated pool", fmtMoney(Number(data.prizePool.currentEstimated)))}
        {stat("Carried jackpot", fmtMoney(Number(data.prizePool.carriedJackpot)))}
        {stat("Draws published", data.draws.published)}
        {stat("Winners pending", data.winners.pending)}
        {stat("Winners paid", data.winners.paid)}
        {stat("Total paid out", fmtMoney(Number(data.winners.totalPaidOut)))}
      </div>
      <Card>
        <h2 className="text-lg font-bold">Charity contributions</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-mist">
              <th className="py-2">Charity</th><th>%</th><th>Est. monthly</th>
            </tr>
          </thead>
          <tbody>
            {data.charityTotals.map((c: any) => (
              <tr key={c.charity.id} className="border-t border-line">
                <td className="py-2">{c.charity.name}</td>
                <td>{c.percentage}%</td>
                <td className="font-mono">{fmtMoney(Number(c.monthlyContribution))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
