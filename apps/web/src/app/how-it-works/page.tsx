import { SectionTitle, Card, FadeIn } from "@/components/ui";

export default function HowItWorks() {
  const items = [
    { t: "1 · Subscribe", d: "Monthly or yearly via Stripe. Access unlocks the moment the webhook confirms payment — never before." },
    { t: "2 · Score", d: "Enter your last 5 Stableford scores (1–45), one per date. Your latest five are always your draw line; the oldest drops off automatically." },
    { t: "3 · Pick a charity", d: "Choose any charity in the directory. 10% of your fee is the minimum — raise it whenever you like." },
    { t: "4 · The monthly draw", d: "Five numbers are drawn at random, or weighted by score frequency. Match 3, 4, or 5 to win a share of the pool." },
    { t: "5 · Verify & get paid", d: "Winners upload a screenshot of their scores. An admin verifies, and your payout is marked complete." },
  ];
  return (
    <section className="mx-auto max-w-3xl px-4 py-20">
      <SectionTitle kicker="How it works" title="From tee-off to payout" />
      <div className="space-y-4">
        {items.map((it, i) => (
          <FadeIn key={it.t} delay={i * 0.05}>
            <Card>
              <h3 className="text-lg font-bold text-mint">{it.t}</h3>
              <p className="mt-2 text-mist">{it.d}</p>
            </Card>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
