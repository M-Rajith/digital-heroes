"use client";

import { motion } from "framer-motion";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass p-6 ${className}`}>{children}</div>;
}

export function SectionTitle({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-12 text-center">
      <p className="eyebrow mb-3">{kicker}</p>
      <h2 className="text-3xl font-bold tracking-tightest sm:text-5xl">{title}</h2>
      {sub && <p className="mx-auto mt-4 max-w-xl text-mist">{sub}</p>}
    </div>
  );
}

export function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Draw number ball — monochrome; "won" renders as a solid white ball. */
export function Ball({ n, won }: { n: number; won?: boolean }) {
  return (
    <span
      className="num-ball"
      style={
        won
          ? { background: "#fff", color: "#000", borderColor: "#fff", boxShadow: "0 6px 20px rgba(255,255,255,0.35)" }
          : undefined
      }
    >
      {n}
    </span>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center text-sm text-mist backdrop-blur-md">
      {message}
    </div>
  );
}

/** Apple-style inline stat */
export function Stat({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="glass px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-widest text-mist">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${mono ? "font-display tabular-nums" : ""}`}>
        {value}
      </p>
    </div>
  );
}
