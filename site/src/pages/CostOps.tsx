import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import clsx from "clsx";
import { Badge, Card, DemoNotice, LineChart, Meter, PageHeader, Slider, Stat } from "../components/ui";
import { PROJECTS } from "../data/projects";

const P = PROJECTS.find((p) => p.key === "genaiops")!;
type Model = { key: string; name: string; inRate: number; outRate: number; latency: number; quality: number; color: string };
// Example on-demand rates in USD per 1M tokens. Editable: always check current Amazon Bedrock pricing.
const DEFAULT_MODELS: Model[] = [
  { key: "s", name: "Small (Haiku-class)", inRate: 0.8, outRate: 4, latency: 0.6, quality: 78, color: "#10B981" },
  { key: "m", name: "Medium (Sonnet-class)", inRate: 3, outRate: 15, latency: 1.4, quality: 89, color: "#8B5CF6" },
  { key: "l", name: "Large (Opus-class)", inRate: 15, outRate: 75, latency: 3.2, quality: 93, color: "#F59E0B" },
];
const usd = (n: number) => (n >= 1000 ? `$${Math.round(n).toLocaleString()}` : `$${n.toFixed(2)}`);

export function CostOps() {
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [primary, setPrimary] = useState("m");
  const [reqs, setReqs] = useState(50000);
  const [inTok, setInTok] = useState(3000);
  const [outTok, setOutTok] = useState(400);
  const [cache, setCache] = useState(40);
  const [batch, setBatch] = useState(20);
  const [route, setRoute] = useState(30);
  const [growth, setGrowth] = useState(8);
  const [w, setW] = useState({ quality: 50, latency: 20, cost: 30 });

  const calc = useMemo(() => {
    const pm = models.find((m) => m.key === primary)!;
    const sm = models.find((m) => m.key === "s")!;
    const monthly = reqs * 30;
    const cost = (m: Model, share: number, cachePct: number, batchPct: number) => {
      const n = monthly * share;
      const input = ((n * inTok) / 1e6) * m.inRate * (1 - cachePct + cachePct * 0.1);
      const output = ((n * outTok) / 1e6) * m.outRate;
      const disc = 1 - batchPct * 0.5;
      return { input: input * disc, output: output * disc };
    };
    const base = cost(pm, 1, 0, 0);
    const r = primary === "s" ? 0 : route / 100;
    const o1 = cost(pm, 1 - r, cache / 100, batch / 100);
    const o2 = cost(sm, r, cache / 100, batch / 100);
    const opt = { input: o1.input + o2.input, output: o1.output + o2.output };
    const baseTotal = base.input + base.output, optTotal = opt.input + opt.output;
    const quality = pm.quality * (1 - r) + sm.quality * r;
    const latency = pm.latency * (1 - r) + sm.latency * r;
    const months = Array.from({ length: 12 }, (_, i) => Math.pow(1 + growth / 100, i));
    return { base, opt, baseTotal, optTotal, quality, latency, pm, months, per1k: (optTotal / monthly) * 1000 };
  }, [models, primary, reqs, inTok, outTok, cache, batch, route, growth]);

  const scores = useMemo(() => {
    const costOf = (m: Model) => (inTok * m.inRate + outTok * m.outRate) / 1e6;
    const maxC = Math.max(...models.map(costOf)), maxL = Math.max(...models.map((m) => m.latency));
    const tot = w.quality + w.latency + w.cost || 1;
    return models.map((m) => ({
      m, perReq: costOf(m),
      score: (w.quality * (m.quality / 100) + w.latency * (1 - m.latency / maxL + 0.1) + w.cost * (1 - costOf(m) / maxC + 0.1)) / tot,
    })).sort((a, b) => b.score - a.score);
  }, [models, w, inTok, outTok]);

  const savings = calc.baseTotal - calc.optTotal;
  const setRate = (k: string, f: "inRate" | "outRate", v: number) => setModels((ms) => ms.map((m) => (m.key === k ? { ...m, [f]: v } : m)));

  return (
    <>
      <PageHeader eyebrow="Capstone 08 · MLOps & Cost" title={P.title} subtitle={P.pitch} />
      <DemoNotice stack={P.services} folder={P.folder}>
        Model a production workload and apply the three biggest Bedrock cost levers: prompt caching (cached input billed at about 10% of the input
        rate), batch inference (50% discount) and routing simple requests to a smaller model. Token rates are editable examples, not live pricing;
        quality and latency figures are illustrative eval results. The repository includes the CloudWatch metrics reader and a routing classifier.
      </DemoNotice>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Baseline / month" value={usd(calc.baseTotal)} hint={`all traffic on ${calc.pm.name.split(" ")[0]}`} />
        <Stat label="Optimized / month" value={usd(calc.optTotal)} tone="pos" hint={`${usd(calc.per1k)} per 1k requests`} />
        <Stat label="Savings" value={`${calc.baseTotal ? Math.round((savings / calc.baseTotal) * 100) : 0}%`} tone="violet" hint={`${usd(savings)} per month`} />
        <Stat label="Blended quality" value={calc.quality.toFixed(1)} tone={calc.quality < calc.pm.quality - 3 ? "amber" : undefined} hint={`p50 latency ${calc.latency.toFixed(2)} s`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card title="Workload">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {models.map((m) => (
                  <button key={m.key} onClick={() => setPrimary(m.key)} className={clsx("rounded-full border px-2.5 py-1 text-[11px]", primary === m.key ? "border-violet/50 bg-violet/15 text-violet-light" : "border-glass text-gray-400")}>{m.name}</button>
                ))}
              </div>
              <Slider label="Requests per day" value={reqs} min={1000} max={500000} step={1000} onChange={setReqs} format={(v) => v.toLocaleString()} />
              <Slider label="Avg input tokens" value={inTok} min={100} max={20000} step={100} onChange={setInTok} format={(v) => v.toLocaleString()} />
              <Slider label="Avg output tokens" value={outTok} min={50} max={4000} step={50} onChange={setOutTok} format={(v) => v.toLocaleString()} />
              <Slider label="Monthly traffic growth" value={growth} min={0} max={30} onChange={setGrowth} format={(v) => `${v}%`} />
            </div>
          </Card>
          <Card title="Cost levers">
            <div className="space-y-4">
              <Slider label="Input served from prompt cache" value={cache} min={0} max={90} onChange={setCache} format={(v) => `${v}%`} />
              <Slider label="Traffic sent via batch inference" value={batch} min={0} max={100} onChange={setBatch} format={(v) => `${v}%`} />
              <Slider label="Routed to small model" value={route} min={0} max={80} onChange={setRoute} format={(v) => (primary === "s" ? "n/a" : `${v}%`)} />
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="12-month spend projection">
            <LineChart height={180} series={[
              { label: `Baseline (${usd(calc.baseTotal * calc.months.reduce((a, b) => a + b, 0))}/yr)`, values: calc.months.map((g) => calc.baseTotal * g), color: "#EF4444" },
              { label: `Optimized (${usd(calc.optTotal * calc.months.reduce((a, b) => a + b, 0))}/yr)`, values: calc.months.map((g) => calc.optTotal * g), color: "#10B981" },
            ]} />
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Monthly cost breakdown">
              {[{ label: "Baseline", d: calc.base }, { label: "Optimized", d: calc.opt }].map((row) => (
                <div key={row.label} className="mb-4 last:mb-0">
                  <div className="mb-1 flex justify-between text-xs"><span className="text-gray-300">{row.label}</span><span className="font-mono text-gray-400">{usd(row.d.input + row.d.output)}</span></div>
                  <div className="flex h-3 overflow-hidden rounded bg-white/5">
                    <div className="bg-violet" style={{ width: `${(row.d.input / Math.max(calc.baseTotal, 1e-9)) * 100}%` }} />
                    <div className="bg-cyan" style={{ width: `${(row.d.output / Math.max(calc.baseTotal, 1e-9)) * 100}%` }} />
                  </div>
                  <div className="mt-1 flex gap-3 text-[11px] text-gray-500"><span><span className="text-violet-light">■</span> input {usd(row.d.input)}</span><span><span className="text-cyan-light">■</span> output {usd(row.d.output)}</span></div>
                </div>
              ))}
            </Card>
            <Card title="Token rates (USD / 1M tokens)">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-[10px] uppercase text-gray-500"><th className="pb-2 font-medium">Model</th><th className="pb-2 font-medium">Input</th><th className="pb-2 font-medium">Output</th></tr></thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.key}>
                      <td className="py-1 pr-2 text-gray-300"><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: m.color }} />{m.name.split(" ")[0]}</td>
                      {(["inRate", "outRate"] as const).map((f) => (
                        <td key={f} className="py-1 pr-2"><input type="number" step="0.1" value={m[f]} onChange={(e) => setRate(m.key, f, Number(e.target.value) || 0)}
                          className="w-20 rounded border border-glass bg-obsidian/60 px-1.5 py-1 font-mono text-xs" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
          <Card title="Model selection scorecard" right={<span className="text-[11px] text-gray-500">weights</span>}>
            <div className="grid gap-4 md:grid-cols-[200px_1fr]">
              <div className="space-y-3">
                <Slider label="Quality" value={w.quality} min={0} max={100} onChange={(v) => setW({ ...w, quality: v })} />
                <Slider label="Latency" value={w.latency} min={0} max={100} onChange={(v) => setW({ ...w, latency: v })} />
                <Slider label="Cost" value={w.cost} min={0} max={100} onChange={(v) => setW({ ...w, cost: v })} />
              </div>
              <div className="space-y-2">
                {scores.map((s, i) => (
                  <div key={s.m.key} className={clsx("rounded-lg border p-3", i === 0 ? "border-emerald/40 bg-emerald/[0.07]" : "border-glass")}>
                    <div className="flex items-center gap-2 text-sm">
                      {i === 0 && <Trophy size={14} className="text-emerald-light" />}
                      <span className="font-medium">{s.m.name}</span>
                      <span className="ml-auto font-mono text-gray-300">{(s.score * 100).toFixed(1)}</span>
                    </div>
                    <Meter value={s.score} color={s.m.color} className="my-1.5" />
                    <div className="flex flex-wrap gap-1.5">
                      <Badge>quality {s.m.quality}</Badge><Badge>p50 {s.m.latency}s</Badge><Badge>${(s.perReq * 1000).toFixed(2)} / 1k req</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
