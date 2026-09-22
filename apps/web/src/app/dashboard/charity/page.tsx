"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui";

export default function CharityPage() {
  const [charities, setCharities] = useState<any[]>([]);
  const [selection, setSelection] = useState<any>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api<any[]>("/charities", { auth: false }).then(setCharities).catch(() => {});
    api("/users/me").then((me: any) => setSelection(me.charitySelection)).catch(() => {});
  }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    const fd = new FormData(e.currentTarget);
    try {
      await api("/charities/selection", {
        method: "PUT",
        body: JSON.stringify({ charityId: fd.get("charityId"), percentage: Number(fd.get("percentage")) }),
      });
      setMsg("Saved. Your contribution starts with your next billing cycle.");
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My charity</h1>
      <Card>
        <form onSubmit={save} className="space-y-4">
          <select name="charityId" required className="input" defaultValue={selection?.charityId ?? ""}>
            <option value="" disabled>Choose a charity</option>
            {charities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div>
            <label className="text-sm text-mist">Contribution % of your subscription (minimum 10, raise it anytime)</label>
            <input name="percentage" type="number" min={10} max={100}
              defaultValue={selection?.percentage ?? 10} className="input mt-1" />
          </div>
          <button className="btn-primary">Save selection</button>
          {msg && <p className="text-sm text-mint">{msg}</p>}
        </form>
      </Card>
    </div>
  );
}
