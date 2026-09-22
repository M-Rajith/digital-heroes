"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [data, setData] = useState<any>({ items: [], total: 0 });

  const load = () =>
    api(`/admin/users?q=${encodeURIComponent(q)}&status=${status}`)
      .then(setData).catch(() => {});
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>
      <Card>
        <div className="flex flex-wrap gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="input sm:w-64" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input sm:w-40">
            <option value="all">All</option>
            <option value="active">Active subs</option>
            <option value="lapsed">Lapsed</option>
          </select>
          <button onClick={load} className="btn-ghost">Filter</button>
        </div>
      </Card>
      <p className="text-sm text-mist">{data.total} user(s)</p>
      <div className="space-y-2">
        {data.items.map((u: any) => (
          <div key={u.id} className="rounded-xl border border-line bg-panel px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{u.name ?? "—"} <span className="text-mist">{u.email}</span></p>
                <p className="text-sm text-mist">
                  Joined {fmtDate(u.createdAt)} ·{" "}
                  {u.subscriptions?.[0]
                    ? `${u.subscriptions[0].plan} / ${u.subscriptions[0].status}`
                    : "No subscription"}{" · "}
                  {u.charitySelection
                    ? `${u.charitySelection.charity?.name} (${u.charitySelection.percentage}%)`
                    : "No charity"}
                </p>
              </div>
              <span className={`badge ${u.role === "ADMIN" ? "border-gold/40 bg-gold/10 text-gold" : "border-line text-mist"}`}>
                {u.role}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
