export function fmtMoney(v: number | string | null | undefined, currency = "$") {
  if (v == null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  return `${currency}${n.toFixed(2)}`;
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export const WINNER_STATUS_STYLE: Record<string, string> = {
  PENDING_VERIFICATION: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  VERIFIED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  REJECTED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  PAID: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};
