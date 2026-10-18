export type Rng = () => number;

/** Deterministic PRNG: same seed always produces the same trial. */
export function makeRng(seed: string): Rng {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rnd: Rng, list: readonly T[]): T {
  return list[Math.floor(rnd() * list.length) % list.length];
}

export function int(rnd: Rng, min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

export function shuffle<T>(rnd: Rng, list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function sample<T>(rnd: Rng, list: readonly T[], count: number): T[] {
  return shuffle(rnd, list).slice(0, count);
}
