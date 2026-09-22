import Link from "next/link";
import { api } from "@/lib/api";
import { Card, SectionTitle, FadeIn, Ball, Stat } from "@/components/ui";
import { fmtMoney } from "@/lib/format";

async function getCurrent() {
  try {
    return await api<any>("/draws/current", { auth: false });
  } catch {
    return null;
  }
}

export default async function Home() {
  const current = await getCurrent();
  const pool = current?.estimatedPool ? Number(current.estimatedPool) : 0;
  const jackpot = current?.jackpot ? Number(current.jackpot) : 0;

  const steps = [
    { n: "01", t: "Subscribe", d: "One plan, monthly or yearly. Your access begins the moment payment is verified — and a share of every fee funds the prize pool." },
    { n: "02", t: "Enter your scores", d: "Log your last five Stableford rounds. Your latest five always form your draw line — the oldest drops off automatically." },
    { n: "03", t: "Win & give", d: "Match 3, 4, or 5 numbers in the monthly draw. And at least 10% of your subscription goes to the charity you choose." },
  ];

  const tiers = [
    { match: "5-number match", share: "40%", note: "The jackpot. Rolls over unclaimed." },
    { match: "4-number match", share: "35%", note: "Split equally between winners." },
    { match: "3-number match", share: "25%", note: "Split equally between winners." },
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden px-5 pb-24 pt-36 text-center sm:pt-44">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 340px at 50% 0%, rgba(255,255,255,0.14), transparent 65%)",
          }}
        />
        <FadeIn className="relative">
          <p className="eyebrow animate-pulseSoft">Golf · Monthly Draws · Charity</p>
          <h1 className="mx-auto mt-5 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tightest sm:text-7xl">
            <span className="grad-text">Play. Win.</span>
            <br />
            <span className="grad-text">Give back.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-mist">
            Track your rounds, enter the monthly draw, and turn your
            subscription into funding for a cause you care about.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/pricing" className="btn-primary">Subscribe now</Link>
            <Link href="/how-it-works" className="btn-ghost">How it works</Link>
          </div>

          {pool > 0 && (
            <div className="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Estimated pool" value={<span className="grad-text">{fmtMoney(pool)}</span>} />
              <Stat label="Jackpot" value={<span className="grad-text">{fmtMoney(jackpot)}</span>} />
              <Stat label="Active players" value={current?.activeSubscribers ?? 0} />
            </div>
          )}
        </FadeIn>
      </section>

      {/* STEPS */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionTitle kicker="The loop" title="Three steps. One habit." />
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <FadeIn key={s.n} delay={i * 0.08}>
              <Card className="hoverable h-full">
                <p className="font-display text-sm font-semibold tabular-nums text-white/40">{s.n}</p>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight">{s.t}</h3>
                <p className="mt-3 leading-relaxed text-mist">{s.d}</p>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* PRIZE POOL */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionTitle
          kicker="The draw"
          title="Where the money goes"
          sub="A fixed share of every subscription funds the pool. Distribution is automatic, transparent, and enforced in code."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {tiers.map((t, i) => (
            <FadeIn key={t.match} delay={i * 0.08}>
              <Card className="hoverable h-full text-center">
                <div className="flex justify-center gap-1.5">
                  {[...Array(5)].map((_, b) => (
                    <Ball key={b} n={b + 1} won />
                  ))}
                </div>
                <p className="mt-6 text-sm font-medium uppercase tracking-widest text-mist">{t.match}</p>
                <p className="grad-text mt-2 font-display text-6xl font-bold tabular-nums">{t.share}</p>
                <p className="mt-3 text-sm text-mist">{t.note}</p>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* LIVE RESULTS PREVIEW */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionTitle
          kicker="Results"
          title="Published draws"
          sub="Every result is public — winning numbers, pools, and winners."
        />
        <FadeIn>
          <Card className="flex flex-col items-center justify-between gap-6 p-10 text-center md:flex-row md:text-left">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">Full history, zero secrets.</h3>
              <p className="mt-2 max-w-md text-mist">
                See every published cycle: the winning line, the pool breakdown,
                and who won — no account required.
              </p>
            </div>
            <Link href="/draws" className="btn-primary shrink-0">View results</Link>
          </Card>
        </FadeIn>
      </section>

      {/* CHARITY */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionTitle
          kicker="Impact first"
          title="At least 10% always gives back"
          sub="You pick the charity. Raise your contribution any time."
        />
        <FadeIn>
          <Card className="relative overflow-hidden p-10 md:p-14">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(500px 240px at 20% 0%, rgba(10,132,255,0.12), transparent 60%)",
              }}
            />
            <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div className="max-w-xl">
                <h3 className="text-3xl font-semibold tracking-tight">
                  Your subscription is a donation engine.
                </h3>
                <p className="mt-3 text-mist">
                  From youth coaching to urban green spaces — direct part of
                  your fee to the cause that matters to you.
                </p>
              </div>
              <Link href="/charities" className="btn-primary shrink-0">Explore charities</Link>
            </div>
          </Card>
        </FadeIn>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 pb-10 pt-14 text-center">
        <FadeIn>
          <h2 className="mx-auto max-w-2xl text-4xl font-bold tracking-tightest sm:text-5xl">
            <span className="grad-text">Your next round could fund the next one.</span>
          </h2>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary">Create account</Link>
            <Link href="/pricing" className="btn-ghost">See pricing</Link>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
