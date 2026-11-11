import { useMemo, useState } from "react";
import { Dices } from "lucide-react";
import { Button, Card, DemoNotice, PageHeader, Slider, Stat, TextArea, Toggle } from "../components/ui";
import { SPACE, encode, pretokenize, trainBPE } from "../lib/bpe";
import { PROJECTS } from "../data/projects";

const P = PROJECTS.find((p) => p.key === "tokenizer")!;
const SAMPLE = "Amazon Bedrock makes foundation models available through one API. Foundation models generate text, images and code. Tokenization splits text into tokens, and tokens determine cost: more tokens, more cost, more latency.";
const PALETTE = ["#8B5CF6", "#22D3EE", "#10B981", "#F59E0B", "#F472B6", "#60A5FA", "#F87171"];
const CANDIDATES: { tok: string; logit: number }[] = [
  { tok: " scalable", logit: 3.1 }, { tok: " secure", logit: 2.8 }, { tok: " a", logit: 2.4 }, { tok: " down", logit: 1.9 },
  { tok: " expensive", logit: 1.6 }, { tok: " everywhere", logit: 1.1 }, { tok: " blue", logit: 0.5 }, { tok: " made", logit: 0.2 },
];

export function TokenizerLab() {
  const [text, setText] = useState(SAMPLE);
  const [nMerges, setNMerges] = useState(40);
  const [showIds, setShowIds] = useState(false);
  const [temp, setTemp] = useState(1);
  const [topK, setTopK] = useState(8);
  const [topP, setTopP] = useState(1);
  const [hist, setHist] = useState<Record<string, number>>({});

  const { merges, tokens, vocab } = useMemo(() => {
    const merges = trainBPE(text, nMerges);
    const tokens = encode(text, merges);
    const base = Array.from(new Set(Array.from(pretokenize(text).join("")))).sort();
    const vocab = [...base, ...merges.map((m) => m.a + m.b)];
    return { merges, tokens, vocab };
  }, [text, nMerges]);
  const ids = useMemo(() => new Map(vocab.map((v, i) => [v, i])), [vocab]);

  const probs = useMemo(() => {
    const scaled = CANDIDATES.map((c) => ({ ...c, s: c.logit / Math.max(temp, 0.01) }));
    const mx = Math.max(...scaled.map((c) => c.s));
    const z = scaled.reduce((a, c) => a + Math.exp(c.s - mx), 0);
    const sorted = scaled.map((c) => ({ tok: c.tok, p: Math.exp(c.s - mx) / z })).sort((a, b) => b.p - a.p);
    let cum = 0;
    const kept = sorted.map((c, i) => { const keep = i < topK && cum < topP; cum += c.p; return { ...c, keep }; });
    const zk = kept.filter((c) => c.keep).reduce((a, c) => a + c.p, 0);
    return kept.map((c) => ({ ...c, final: c.keep ? c.p / zk : 0 }));
  }, [temp, topK, topP]);

  const sample = (n: number) => {
    const next = { ...hist };
    for (let i = 0; i < n; i++) {
      let r = Math.random(), pick = probs[0].tok;
      for (const c of probs) { if (c.final <= 0) continue; r -= c.final; if (r <= 0) { pick = c.tok; break; } }
      next[pick] = (next[pick] ?? 0) + 1;
    }
    setHist(next);
  };
  const totalSamples = Object.values(hist).reduce((a, b) => a + b, 0);
  const chars = text.length;

  return (
    <>
      <PageHeader eyebrow="Capstone 04 · Foundation Models" title={P.title} subtitle={P.pitch} />
      <DemoNotice stack={P.services} folder={P.folder}>
        The tokenizer below is a real byte-pair-encoding trainer using the GPT-2 pre-tokenization regex, trained live on whatever you
        type. Drag the merges slider to watch characters fuse into sub-words. The sampling panel applies softmax with temperature,
        top-k and top-p to a fixed set of next-token logits.
      </DemoNotice>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Characters" value={chars} />
        <Stat label="Tokens" value={tokens.length} tone="violet" />
        <Stat label="Chars / token" value={(chars / Math.max(1, tokens.length)).toFixed(2)} tone="cyan" hint="GPT-2 averages about 4 on English" />
        <Stat label="Vocabulary" value={vocab.length} hint={`${vocab.length - merges.length} base + ${merges.length} merges`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Card title="Training text">
            <TextArea value={text} onChange={setText} rows={4} />
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Slider label="BPE merges" value={nMerges} min={0} max={150} onChange={setNMerges} />
              <Toggle label="Show token IDs" checked={showIds} onChange={setShowIds} />
            </div>
          </Card>
          <Card title="Tokenized output">
            <div className="flex flex-wrap gap-y-1.5 font-mono text-[13px] leading-6">
              {tokens.map((t, i) => (
                <span key={i} className="rounded-sm px-[1px]" style={{ background: `${PALETTE[i % PALETTE.length]}33`, boxShadow: `inset 0 -2px ${PALETTE[i % PALETTE.length]}88` }}>
                  {showIds ? <span className="text-[11px] text-gray-300">{ids.get(t)}</span> : t.split(SPACE).join("·")}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-gray-500">The middle dot marks a leading space, which GPT-2 stores inside the token (shown as Ġ in its vocabulary).</p>
          </Card>
          <Card title="Next-token sampling · prompt: “The cloud is”" right={<span className="font-mono text-[11px] text-gray-500">{totalSamples} samples</span>}>
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <div className="space-y-1.5">
                {probs.map((c) => (
                  <div key={c.tok} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 font-mono text-gray-300">{c.tok.replace(" ", "·")}</span>
                    <div className="relative h-4 flex-1 overflow-hidden rounded bg-white/5">
                      <div className="absolute inset-y-0 left-0 bg-white/10" style={{ width: `${c.p * 100}%` }} />
                      <div className="absolute inset-y-0 left-0 rounded bg-violet/70 transition-all" style={{ width: `${c.final * 100}%` }} />
                    </div>
                    <span className="w-12 text-right font-mono text-gray-400">{(c.final * 100).toFixed(1)}%</span>
                    <span className="w-10 text-right font-mono text-cyan-light">{totalSamples ? Math.round(((hist[c.tok] ?? 0) / totalSamples) * 100) + "%" : ""}</span>
                  </div>
                ))}
                <p className="pt-1 text-[11px] text-gray-500">Grey = raw softmax, violet = after top-k / top-p filtering, cyan = observed sample frequency.</p>
              </div>
              <div className="space-y-3">
                <Slider label="Temperature" value={temp} min={0.1} max={2} step={0.05} onChange={setTemp} format={(v) => v.toFixed(2)} />
                <Slider label="Top-k" value={topK} min={1} max={8} onChange={setTopK} />
                <Slider label="Top-p" value={topP} min={0.1} max={1} step={0.05} onChange={setTopP} format={(v) => v.toFixed(2)} />
                <div className="flex gap-2">
                  <Button onClick={() => sample(200)} className="flex-1"><Dices size={14} /> Sample 200</Button>
                  <Button variant="ghost" onClick={() => setHist({})}>Reset</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card title={`Merge table · ${merges.length}`} pad={false}>
          <div className="max-h-[640px] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface"><tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 font-medium">#</th><th className="px-3 py-2 font-medium">Pair</th><th className="px-3 py-2 font-medium">New token</th><th className="px-3 py-2 text-right font-medium">Freq</th></tr></thead>
              <tbody className="font-mono">
                {merges.map((m, i) => (
                  <tr key={i} className="border-t border-glass">
                    <td className="px-3 py-1 text-gray-600">{i + 1}</td>
                    <td className="px-3 py-1 text-gray-400">{m.a} + {m.b}</td>
                    <td className="px-3 py-1 text-violet-light">{m.a + m.b}</td>
                    <td className="px-3 py-1 text-right text-gray-500">{m.freq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
