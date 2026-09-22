import { api } from "@/lib/api";
import { Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CharityDetail({ params }: { params: { slug: string } }) {
  let c: any;
  try {
    c = await api<any>(`/charities/${params.slug}`, { auth: false });
  } catch { notFound(); }

  return (
    <section className="mx-auto max-w-3xl px-4 py-20">
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-mint">Charity</p>
        <h1 className="mt-2 text-3xl font-bold">{c.name}</h1>
        <p className="mt-4 leading-relaxed text-mist">{c.description}</p>
        {c.events?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold">Upcoming events</h2>
            <ul className="mt-3 space-y-3">
              {c.events.map((e: any) => (
                <li key={e.id} className="rounded-xl border border-line p-4">
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-sm text-mist">{fmtDate(e.eventDate)}{e.location ? ` · ${e.location}` : ""}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </section>
  );
}
