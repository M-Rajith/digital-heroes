"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui";

export default function AdminCharities() {
  const [charities, setCharities] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api<any[]>("/charities", { auth: false }).then(setCharities).catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name"));
    try {
      await api("/admin/charities", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          description: String(fd.get("description")),
          isFeatured: fd.get("isFeatured") === "on",
        }),
      });
      (e.target as HTMLFormElement).reset();
      setMsg("Charity added.");
      load();
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  async function toggle(c: any) {
    if (c.isActive) {
      await api(`/admin/charities/${c.id}/deactivate`, { method: "POST" }).catch(() => {});
    } else {
      await api(`/admin/charities/${c.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...c, isActive: true }),
      }).catch(() => {});
    }
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Charities</h1>
      <Card>
        <form onSubmit={create} className="space-y-3">
          <input name="name" required placeholder="Charity name" className="input" />
          <textarea name="description" required placeholder="Description" className="input" rows={3} />
          <label className="flex items-center gap-2 text-sm text-mist">
            <input name="isFeatured" type="checkbox" /> Feature on homepage
          </label>
          <button className="btn-primary">Add charity</button>
          {msg && <p className="text-sm text-mint">{msg}</p>}
        </form>
      </Card>
      <div className="space-y-2">
        {charities.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-line bg-panel px-5 py-4">
            <div>
              <p className="font-semibold">{c.name} {c.isFeatured && <span className="badge ml-2 border-gold/40 bg-gold/10 text-gold">Featured</span>}</p>
              <p className="text-sm text-mist">{c.slug} · {c.isActive ? "Active" : "Inactive"}</p>
            </div>
            <button onClick={() => toggle(c)} className="btn-ghost !px-3 !py-1.5 text-sm">
              {c.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
