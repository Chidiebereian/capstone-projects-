import { CORPUS } from "../data/corpus";

const STOP = new Set(("a an the and or of to in on for is are be with as at by it this that from your you we our can may must will not if any all per i do get how what when where which who many much me my there their they long should does did today").split(" "));
const SYN: Record<string, string[]> = {
  dinner: ["meal"], lunch: ["meal"], food: ["meal"], spend: ["reimbursed"], wfh: ["remote"], home: ["remote"],
  vacation: ["paid", "time", "off"], holiday: ["holiday", "paid", "time", "off"], leave: ["leave", "time", "off"],
  laptop: ["device"], stolen: ["stolen", "lost"], chatgpt: ["public", "ai", "chatbot"], buy: ["purchase"],
  kept: ["retained"], keep: ["retained"], logs: ["log"], pager: ["page"], hack: ["phishing", "incident"],
};

export const stem = (t: string) => (t.length > 4 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t);
export const tokenize = (s: string) => (s.toLowerCase().match(/[a-z0-9$]+/g) ?? []).filter((t) => !STOP.has(t)).map(stem);
export const synonyms = (t: string) => (SYN[t] ?? []).map(stem);
export const expand = (q: string[]) => Array.from(new Set(q.flatMap((t) => [t, ...synonyms(t)])));

export type Chunk = { id: string; doc: string; text: string; terms: string[] };
export type Hit = { chunk: Chunk; score: number };

export function chunkCorpus(size: number, overlap: number): Chunk[] {
  const out: Chunk[] = [];
  const stride = Math.max(1, size - overlap);
  for (const d of CORPUS) {
    const words = d.text.split(/\s+/);
    for (let i = 0, k = 0; i < words.length; i += stride, k++) {
      const text = words.slice(i, i + size).join(" ");
      out.push({ id: `${d.id}#${k}`, doc: d.title, text, terms: tokenize(text) });
      if (i + size >= words.length) break;
    }
  }
  return out;
}

/** Okapi BM25 over the chunk index. */
export function bm25(chunks: Chunk[], q: string[], k1 = 1.5, b = 0.75): Hit[] {
  const N = chunks.length;
  const avg = chunks.reduce((s, c) => s + c.terms.length, 0) / Math.max(1, N);
  const df = new Map<string, number>();
  for (const c of chunks) for (const t of new Set(c.terms)) df.set(t, (df.get(t) ?? 0) + 1);
  return chunks
    .map((c) => {
      const tf = new Map<string, number>();
      for (const t of c.terms) tf.set(t, (tf.get(t) ?? 0) + 1);
      let score = 0;
      for (const t of new Set(q)) {
        const f = tf.get(t) ?? 0;
        if (!f) continue;
        const n = df.get(t) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        score += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * c.terms.length) / avg));
      }
      return { chunk: c, score };
    })
    .sort((a, b2) => b2.score - a.score);
}

export type Answer = { sentences: { text: string; cite: number }[]; coverage: number; abstained: boolean };

/** Extractive, citation-backed answer. Abstains when retrieved context does not cover the question. */
export function answer(hits: Hit[], qTerms: string[], qExpanded: string[], minCoverage: number): Answer {
  const ctxTerms = new Set(hits.flatMap((h) => h.chunk.terms));
  // A question term counts as covered only by itself or one of its own synonyms.
  const covered = qTerms.filter((t) => ctxTerms.has(t) || synonyms(t).some((e) => ctxTerms.has(e)));
  const coverage = qTerms.length ? covered.length / qTerms.length : 0;
  if (!hits.length || coverage < minCoverage) return { sentences: [], coverage, abstained: true };
  const qs = new Set(qExpanded);
  const cands = hits.flatMap((h, i) =>
    (h.chunk.text.match(/[^.;]+[.;]?/g) ?? []).map((s) => ({
      text: s.trim(), cite: i + 1,
      score: tokenize(s).filter((t) => qs.has(t)).length + h.score * 0.05,
    })),
  ).filter((c) => c.score >= 1 && c.text.split(" ").length > 3 && /^[A-Z0-9$]/.test(c.text)); // skip fragments cut at chunk boundaries
  const seen = new Set<string>();
  const picked = cands.sort((a, b) => b.score - a.score).filter((c) => (seen.has(c.text) ? false : (seen.add(c.text), true))).slice(0, 2);
  return { sentences: picked, coverage, abstained: picked.length === 0 };
}
