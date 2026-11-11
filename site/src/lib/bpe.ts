// GPT-2 style pre-tokenizer (words keep their leading space).
const PRE = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
export const SPACE = "Ġ";
export const pretokenize = (text: string) => (text.match(PRE) ?? []).map((p) => p.replace(/ /g, SPACE));
export type Merge = { a: string; b: string; freq: number };

/** Train byte-pair-encoding merges on the given text. */
export function trainBPE(text: string, numMerges: number): Merge[] {
  const counts = new Map<string, number>();
  for (const p of pretokenize(text)) counts.set(p, (counts.get(p) ?? 0) + 1);
  const words = Array.from(counts.entries()).map(([w, c]) => ({ syms: Array.from(w), c }));
  const merges: Merge[] = [];
  for (let m = 0; m < numMerges; m++) {
    const pairs = new Map<string, number>();
    for (const w of words) for (let i = 0; i < w.syms.length - 1; i++) {
      const k = JSON.stringify([w.syms[i], w.syms[i + 1]]);
      pairs.set(k, (pairs.get(k) ?? 0) + w.c);
    }
    let best = "", bf = 1;
    for (const [k, f] of pairs) if (f > bf) { best = k; bf = f; }
    if (!best) break;
    const [a, b] = JSON.parse(best) as [string, string];
    merges.push({ a, b, freq: bf });
    for (const w of words) {
      const out: string[] = [];
      for (let i = 0; i < w.syms.length; i++) {
        if (i < w.syms.length - 1 && w.syms[i] === a && w.syms[i + 1] === b) { out.push(a + b); i++; } else out.push(w.syms[i]);
      }
      w.syms = out;
    }
  }
  return merges;
}

export function encode(text: string, merges: Merge[]): string[] {
  return pretokenize(text).flatMap((p) => {
    let syms = Array.from(p);
    for (const { a, b } of merges) {
      if (syms.length < 2) break;
      const out: string[] = [];
      for (let i = 0; i < syms.length; i++) {
        if (i < syms.length - 1 && syms[i] === a && syms[i + 1] === b) { out.push(a + b); i++; } else out.push(syms[i]);
      }
      syms = out;
    }
    return syms;
  });
}
