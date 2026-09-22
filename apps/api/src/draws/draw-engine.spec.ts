import {
  NUMBER_MAX,
  NUMBER_MIN,
  PICK_COUNT,
  entryWeight,
  lineFromScores,
  matchCount,
  mulberry32,
  sampleUnique,
} from "./draw-engine";

describe("draw-engine", () => {
  it("samples PICK_COUNT unique numbers within range", () => {
    const nums = sampleUnique(PICK_COUNT, NUMBER_MIN, NUMBER_MAX, mulberry32(42));
    expect(nums).toHaveLength(PICK_COUNT);
    expect(new Set(nums).size).toBe(PICK_COUNT);
    for (const n of nums) {
      expect(n).toBeGreaterThanOrEqual(NUMBER_MIN);
      expect(n).toBeLessThanOrEqual(NUMBER_MAX);
    }
  });

  it("is deterministic given a seed", () => {
    const a = sampleUnique(5, 1, 45, mulberry32(7));
    const b = sampleUnique(5, 1, 45, mulberry32(7));
    expect(a).toEqual(b);
  });

  it("weighted sampling favors frequent numbers", () => {
    // number 10 has overwhelming weight
    let hits = 0;
    for (let seed = 0; seed < 200; seed++) {
      const nums = sampleUnique(5, 1, 45, mulberry32(seed), (n) => (n === 10 ? 1000 : 1));
      if (nums.includes(10)) hits++;
    }
    expect(hits / 200).toBeGreaterThan(0.9);
  });

  it("computes entry weight from average score", () => {
    expect(entryWeight(0)).toBe(1);
    expect(entryWeight(45)).toBeCloseTo(2);
    expect(entryWeight(22.5)).toBeCloseTo(1.5);
  });

  it("builds a 5-number line from scores clamped to range", () => {
    const line = lineFromScores([10, 20, 30, 40, 45]);
    expect(line).toHaveLength(5);
    expect(line.every((n) => n >= 1 && n <= 45)).toBe(true);
    expect(line).toEqual([...line].sort((a, b) => a - b));
  });

  it("matchCount counts intersection", () => {
    expect(matchCount([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBe(5);
    expect(matchCount([1, 2, 3, 9, 9], [1, 2, 3, 7, 8])).toBe(3);
    expect(matchCount([40, 41, 42, 43, 44], [1, 2, 3, 4, 5])).toBe(0);
  });
});
