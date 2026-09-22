/**
 * Pure draw engine — deterministic given a seed, no I/O. Fully unit-testable.
 *
 * RANDOM:   uniform sampling of 5 unique numbers from 1..45.
 * WEIGHTED: sampling weighted by number frequency across subscribers' entry
 *           lines ("weighted by score frequency", PRD §06). Frequent numbers
 *           are more likely to be drawn.
 */
export type Rng = () => number; // returns [0, 1)

export const NUMBER_MIN = 1;
export const NUMBER_MAX = 45;
export const PICK_COUNT = 5;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sample `count` unique numbers from [min,max] without replacement. */
export function sampleUnique(
  count: number,
  min: number,
  max: number,
  rng: Rng,
  weight?: (n: number) => number,
): number[] {
  const pool: number[] = [];
  for (let n = min; n <= max; n++) pool.push(n);

  const picked: number[] = [];
  for (let i = 0; i < count; i++) {
    const weights = pool.map((n) => Math.max(weight?.(n) ?? 1, 0.000001));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= weights[idx];
      if (r <= 0) break;
    }
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked.sort((a, b) => a - b);
}

/** Entry weight from the player's recent Stableford scores (higher = more frequent). */
export function entryWeight(avgScore: number): number {
  return 1 + Math.max(0, Math.min(avgScore, 45)) / 45;
}

/** A subscriber's draw line derived deterministically from their latest 5 scores. */
export function lineFromScores(scores: number[]): number[] {
  const clamped = scores.slice(0, 5).map((s) => Math.max(NUMBER_MIN, Math.min(NUMBER_MAX, s)));
  const line = [...new Set(clamped)];
  let salt = 7;
  while (line.length < PICK_COUNT) {
    line.push(NUMBER_MIN + ((salt * 31) % NUMBER_MAX));
    salt += 13;
  }
  return line.slice(0, PICK_COUNT).sort((a, b) => a - b);
}

export function matchCount(entry: number[], winning: number[]): number {
  const win = new Set(winning);
  return entry.filter((n) => win.has(n)).length;
}
