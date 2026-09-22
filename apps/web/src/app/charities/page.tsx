import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

async function getCharities(q = "") {
  try {
    return await api<any[]>(`/charities?q=${encodeURIComponent(q)}`, { auth: false });
  } catch { return []; }
}

export default async function Charities({ searchParams }: { searchParams: { q?: string } }) {
  const charities = await getCharities(searchParams.q ?? "");

  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-mint">Directory</p>
        <h1 className="text-4xl font-bold">Choose where your money goes</h1>
      </div>
      <form className="mx-auto mb-10 flex max-w-md gap-2">
        <input name="q" defaultValue={searchParams.q} placeholder="Search charities…"
          className="input" />
        <button className="btn-ghost shrink-0">Search</button>
      </form>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {charities.map((c: any) => (
          <Link key={c.id} href={`/charities/${c.slug}`}>
            <Card className="h-full transition hover:border-mint/40">
              {c.isFeatured && <span className="badge border-gold/40 bg-gold/10 text-gold">Featured</span>}
              <h3 className="mt-3 text-xl font-bold">{c.name}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-mist">{c.description}</p>
              <p className="mt-4 text-sm font-semibold text-mint">Learn more →</p>
            </Card>
          </Link>
        ))}
      </div>
      {charities.length === 0 && <p className="text-center text-mist">No charities match your search.</p>}
    </section>
  );
}
