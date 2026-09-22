import { api } from "@/lib/api";
import { Card, Ball, Empty } from "@/components/ui";
import { fmtMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Draws() {
  let history: any[] = [];
  try { history = await api<any[]>("/draws/history", { auth: false }); } catch {}

  return (
    <section className="mx-auto max-w-4xl px-4 py-20">
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-mint">Results</p>
        <h1 className="text-4xl font-bold">Published draws</h1>
      </div>
      {history.length === 0 ? (
        <Empty message="No draws published yet — the first one lands on the 1st of next month." />
      ) : (
        <div className="space-y-4">
          {history.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-sm text-mist">Cycle {d.cycleKey}</p>
                  <div className="mt-2 flex gap-2">
                    {d.winningNumbers?.map((n: number) => <Ball key={n} n={n} won />)}
                  </div>
                </div>
                <div className="text-right text-sm text-mist">
                  {d.prizePool && (
                    <p>Pool: <span className="font-mono text-gold">{fmtMoney(Number(d.prizePool.tier5) + Number(d.prizePool.tier4) + Number(d.prizePool.tier3))}</span></p>
                  )}
                  <p>{d.winners?.length ?? 0} winner(s)</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
