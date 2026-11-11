import { useMemo, useState } from "react";
import { BookOpen, Database, FileSearch, ShieldCheck, Sparkles, Split } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card, DemoNotice, Input, Meter, PageHeader, Slider, Stat } from "../components/ui";
import { CORPUS, SAMPLE_QUESTIONS } from "../data/corpus";
import { answer, bm25, chunkCorpus, expand, stem, tokenize } from "../lib/rag";
import { PROJECTS } from "../data/projects";

const P = PROJECTS.find((p) => p.key === "rag")!;

function Highlight({ text, terms }: { text: string; terms: Set<string> }) {
  return (
    <>
      {text.split(/(\s+)/).map((w, i) => {
        const t = stem(w.toLowerCase().replace(/[^a-z0-9$]/g, ""));
        return terms.has(t) ? <mark key={i} className="rounded bg-cyan/20 px-0.5 text-cyan-light">{w}</mark> : <span key={i}>{w}</span>;
      })}
    </>
  );
}

export function RagStudio() {
  const [q, setQ] = useState(SAMPLE_QUESTIONS[0]);
  const [asked, setAsked] = useState(SAMPLE_QUESTIONS[0]);
  const [size, setSize] = useState(40);
  const [overlap, setOverlap] = useState(10);
  const [topK, setTopK] = useState(3);
  const [minCov, setMinCov] = useState(0.5);
  const [doc, setDoc] = useState<string | null>(null);

  const { chunks, tChunk } = useMemo(() => {
    const t0 = performance.now();
    const c = chunkCorpus(size, Math.min(overlap, size - 5));
    return { chunks: c, tChunk: performance.now() - t0 };
  }, [size, overlap]);

  const run = useMemo(() => {
    const t0 = performance.now();
    const qTerms = tokenize(asked);
    const qExp = expand(qTerms);
    const hits = bm25(chunks, qExp).filter((h) => h.score > 0).slice(0, topK);
    const t1 = performance.now();
    const ans = answer(hits, qTerms, qExp, minCov);
    const t2 = performance.now();
    return { qTerms, qExp, hits, ans, tRetrieve: t1 - t0, tGen: t2 - t1 };
  }, [asked, chunks, topK, minCov]);

  const vocab = useMemo(() => new Set(chunks.flatMap((c) => c.terms)).size, [chunks]);
  const termSet = new Set(run.qExp);
  const maxScore = Math.max(1, ...run.hits.map((h) => h.score));
  const ask = (s?: string) => { const v = s ?? q; setQ(v); setAsked(v); };

  const stages = [
    { icon: Split, label: "Chunk + index", ms: tChunk, detail: `${chunks.length} chunks` },
    { icon: FileSearch, label: "Retrieve (BM25)", ms: run.tRetrieve, detail: `top-${topK}` },
    { icon: ShieldCheck, label: "Grounding check", ms: 0, detail: `${Math.round(run.ans.coverage * 100)}% coverage` },
    { icon: Sparkles, label: "Answer + cite", ms: run.tGen, detail: run.ans.abstained ? "abstained" : `${run.ans.sentences.length} citations` },
  ];

  return (
    <>
      <PageHeader eyebrow="Capstone 01 · Embeddings & RAG" title={P.title} subtitle={P.pitch} />
      <DemoNotice stack={P.services} folder={P.folder}>
        Ask anything about the fictional Northwind Cloud employee handbook. Chunking, BM25 ranking, query expansion and the
        grounding guard are real and run in your browser. Answers are extractive, so every sentence is traceable to a source chunk.
        In production, retrieval uses Titan embeddings in OpenSearch Serverless and generation uses Claude via RetrieveAndGenerate.
      </DemoNotice>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="flex gap-2">
              <Input value={q} onChange={setQ} onEnter={() => ask()} className="flex-1" placeholder="Ask the handbook..." />
              <Button onClick={() => ask()}><Sparkles size={14} /> Ask</Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SAMPLE_QUESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)}
                  className={clsx("rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                    asked === s ? "border-violet/50 bg-violet/15 text-violet-light" : "border-glass text-gray-400 hover:text-gray-200")}>
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
              Query terms:
              {run.qExp.map((t) => <Badge key={t} tone={run.qTerms.includes(t) ? "cyan" : "violet"}>{t}</Badge>)}
              <span className="ml-1">(<span className="text-violet-light">violet</span> = synonym expansion)</span>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {stages.map((s, i) => (
              <div key={s.label} className="relative rounded-xl border border-glass bg-surface/70 p-3">
                <div className="flex items-center gap-2 text-xs text-gray-300"><s.icon size={14} className="text-cyan-light" />{s.label}</div>
                <div className="mt-1 font-mono text-sm">{s.ms.toFixed(2)} ms</div>
                <div className="text-[11px] text-gray-500">{s.detail}</div>
                {i < stages.length - 1 && <div className="absolute -right-2 top-1/2 hidden h-px w-2 bg-cyan/40 md:block" />}
              </div>
            ))}
          </div>

          <Card title="Grounded answer" right={run.ans.abstained ? <Badge tone="amber">abstained</Badge> : <Badge tone="emerald">grounded</Badge>}>
            {run.ans.abstained ? (
              <p className="text-sm text-amber-light">
                I can&apos;t answer that from the handbook. The retrieved context covers only {Math.round(run.ans.coverage * 100)}% of the
                question (threshold {Math.round(minCov * 100)}%), so the assistant declines rather than guessing.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-gray-100">
                {run.ans.sentences.map((s, i) => (
                  <span key={i}>{s.text} <sup className="font-mono text-cyan-light">[{s.cite}]</sup>{" "}</span>
                ))}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
              <span>Question coverage</span>
              <Meter value={run.ans.coverage} color={run.ans.coverage >= minCov ? "#10B981" : "#F59E0B"} className="max-w-48" />
              <span className="font-mono">{Math.round(run.ans.coverage * 100)}%</span>
            </div>
          </Card>

          <Card title={`Retrieved context · top ${topK}`} pad={false}>
            <div className="divide-y divide-white/5">
              {run.hits.length === 0 && <div className="p-4 text-sm text-gray-500">No chunk matched any query term.</div>}
              {run.hits.map((h, i) => (
                <div key={h.chunk.id} className="animate-rise p-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-cyan-light">[{i + 1}]</span>
                    <span className="text-gray-300">{h.chunk.doc}</span>
                    <span className="font-mono text-gray-600">{h.chunk.id}</span>
                    <span className="ml-auto font-mono text-gray-400">{h.score.toFixed(3)}</span>
                  </div>
                  <Meter value={h.score} max={maxScore} color="#22D3EE" className="my-2" />
                  <p className="text-sm leading-relaxed text-gray-400"><Highlight text={h.chunk.text} terms={termSet} /></p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Retrieval settings">
            <div className="space-y-4">
              <Slider label="Chunk size (words)" value={size} min={15} max={120} onChange={setSize} />
              <Slider label="Chunk overlap (words)" value={overlap} min={0} max={30} onChange={setOverlap} />
              <Slider label="Top-k results" value={topK} min={1} max={6} onChange={setTopK} />
              <Slider label="Min. question coverage" value={minCov} min={0} max={1} step={0.05} onChange={setMinCov} format={(v) => `${Math.round(v * 100)}%`} />
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Documents" value={CORPUS.length} />
            <Stat label="Chunks" value={chunks.length} tone="cyan" />
            <Stat label="Vocabulary" value={vocab} />
            <Stat label="Avg chunk" value={`${Math.round(chunks.reduce((s, c) => s + c.text.split(" ").length, 0) / chunks.length)}w`} />
          </div>
          <Card title="Knowledge base" right={<Database size={13} className="text-gray-500" />} pad={false}>
            <div className="p-2">
              {CORPUS.map((d) => (
                <button key={d.id} onClick={() => setDoc(doc === d.id ? null : d.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-300 hover:bg-white/5">
                  <BookOpen size={13} className="text-gray-500" /> {d.title}
                  <span className="ml-auto font-mono text-[10px] text-gray-600">{chunks.filter((c) => c.id.startsWith(d.id + "#")).length}</span>
                </button>
              ))}
            </div>
            {doc && <p className="animate-rise border-t border-glass p-3 text-xs leading-relaxed text-gray-400">{CORPUS.find((d) => d.id === doc)!.text}</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
