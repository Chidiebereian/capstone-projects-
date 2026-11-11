import { useEffect, useRef, useState } from "react";
import { Database, Pause, Play, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card, Code, DemoNotice, LineChart, Meter, PageHeader, Slider, Stat, Toggle } from "../components/ui";
import { PROJECTS } from "../data/projects";

const P = PROJECTS.find((p) => p.key === "streaming")!;
const TICK = 0.5; // seconds per simulation tick
const WINDOW_TICKS = 20; // 10 second tumbling window
const REGIONS = ["us-east-1", "eu-west-1", "ap-south-1", "sa-east-1"] as const;
const REGION_W = [0.45, 0.3, 0.17, 0.08];
const TYPES = ["view", "click", "purchase"] as const;
type Agg = Record<string, { view: number; click: number; purchase: number; revenue: number }>;
const emptyAgg = (): Agg => Object.fromEntries(REGIONS.map((r) => [r, { view: 0, click: 0, purchase: 0, revenue: 0 }]));
type FileOut = { path: string; bytes: number; rows: number };

const QUERIES = [
  { key: "rev", label: "Revenue by region", sql: "SELECT region, SUM(revenue) AS revenue, COUNT_IF(event_type = 'purchase') AS orders\nFROM clickstream.events\nWHERE dt = '2026-11-11'\nGROUP BY region ORDER BY revenue DESC;", cols: 0.3 },
  { key: "funnel", label: "Funnel by event type", sql: "SELECT event_type, COUNT(*) AS events\nFROM clickstream.events\nWHERE dt = '2026-11-11'\nGROUP BY event_type;", cols: 0.15 },
  { key: "conv", label: "Conversion rate", sql: "SELECT region,\n  ROUND(100.0 * COUNT_IF(event_type = 'purchase') / COUNT_IF(event_type = 'view'), 2) AS conversion_pct\nFROM clickstream.events\nWHERE dt = '2026-11-11'\nGROUP BY region;", cols: 0.2 },
];
const fmtBytes = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(2)} MB` : `${(b / 1e3).toFixed(1)} KB`);

export function Streaming() {
  const [running, setRunning] = useState(true);
  const [rate, setRate] = useState(1800);
  const [sizeKB, setSizeKB] = useState(1);
  const [shards, setShards] = useState(2);
  const [hotKey, setHotKey] = useState(false);
  const [series, setSeries] = useState<{ inc: number[]; acc: number[]; thr: number[] }>({ inc: [], acc: [], thr: [] });
  const [shardLoad, setShardLoad] = useState<number[]>([]);
  const [totals, setTotals] = useState({ accepted: 0, throttled: 0 });
  const [windows, setWindows] = useState<{ end: number; events: number; purchases: number; revenue: number }[]>([]);
  const [files, setFiles] = useState<FileOut[]>([]);
  const [tail, setTail] = useState<string[]>([]);
  const [query, setQuery] = useState(QUERIES[0].key);
  const lake = useRef<Agg>(emptyAgg());
  const win = useRef({ ticks: 0, events: 0, purchases: 0, revenue: 0, n: 0 });
  const cfg = useRef({ rate, sizeKB, shards, hotKey });
  cfg.current = { rate, sizeKB, shards, hotKey };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const { rate, sizeKB, shards, hotKey } = cfg.current;
      const incoming = Math.round(rate * TICK * (0.85 + Math.random() * 0.3));
      // Kinesis write limit per shard: 1,000 records/s or 1 MB/s, whichever is hit first.
      const cap = Math.floor(Math.min(1000 * TICK, (1024 * TICK) / sizeKB));
      const weights = Array.from({ length: shards }, (_, i) => (hotKey && i === 0 ? 3 : 1) * (0.8 + Math.random() * 0.4));
      const wsum = weights.reduce((a, b) => a + b, 0);
      const load = weights.map((w) => Math.round((incoming * w) / wsum));
      const accepted = load.reduce((a, l) => a + Math.min(l, cap), 0);
      const throttled = Math.max(0, incoming - accepted);
      setShardLoad(load.map((l) => l / cap));
      setSeries((s) => ({ inc: [...s.inc, incoming / TICK].slice(-60), acc: [...s.acc, accepted / TICK].slice(-60), thr: [...s.thr, throttled / TICK].slice(-60) }));
      setTotals((t) => ({ accepted: t.accepted + accepted, throttled: t.throttled + throttled }));

      let purchases = 0, revenue = 0;
      const lk = lake.current;
      REGIONS.forEach((reg, r) => {
        const n = Math.round(accepted * REGION_W[r]);
        const v = Math.round(n * 0.7), c = Math.round(n * 0.22), pu = Math.max(0, n - v - c);
        const rev = pu * (30 + Math.random() * 25);
        lk[reg].view += v; lk[reg].click += c; lk[reg].purchase += pu; lk[reg].revenue += rev;
        purchases += pu; revenue += rev;
      });
      const w = win.current;
      w.ticks++; w.events += accepted; w.purchases += purchases; w.revenue += revenue;
      const roll = Math.random();
      setTail((t) => [JSON.stringify({ user_id: `u-${Math.floor(Math.random() * 90000) + 10000}`, event_type: roll < 0.7 ? "view" : roll < 0.92 ? "click" : "purchase", region: REGIONS[Math.floor(Math.random() * 4)], ts: new Date().toISOString().slice(11, 23) }), ...t].slice(0, 6));
      if (w.ticks >= WINDOW_TICKS) {
        w.n++;
        const done = { end: w.n, events: w.events, purchases: w.purchases, revenue: w.revenue };
        setWindows((ws) => [done, ...ws].slice(0, 8));
        const hh = String(new Date().getUTCHours()).padStart(2, "0");
        const bytes = Math.round(w.events * cfg.current.sizeKB * 1024 * 0.12);
        setFiles((f) => [{ path: `s3://clickstream-lake/events/dt=2026-11-11/hour=${hh}/part-${String(done.end).padStart(5, "0")}.snappy.parquet`, bytes, rows: done.events }, ...f].slice(0, 50));
        win.current = { ticks: 0, events: 0, purchases: 0, revenue: 0, n: w.n };
      }
    }, TICK * 1000);
    return () => clearInterval(id);
  }, [running]);

  const reset = () => {
    lake.current = emptyAgg();
    win.current = { ticks: 0, events: 0, purchases: 0, revenue: 0, n: 0 };
    setSeries({ inc: [], acc: [], thr: [] }); setTotals({ accepted: 0, throttled: 0 }); setWindows([]); setFiles([]); setTail([]);
  };

  const q = QUERIES.find((x) => x.key === query)!;
  const lakeBytes = files.reduce((a, f) => a + f.bytes, 0);
  const scanned = lakeBytes * q.cols;
  const billed = Math.max(scanned, 10 * 1024 * 1024); // Athena bills a 10 MB minimum per query
  const lk = lake.current;
  const headers = query === "rev" ? ["region", "revenue", "orders"] : query === "funnel" ? ["event_type", "events"] : ["region", "conversion_pct"];
  const rows: string[][] = query === "rev"
    ? [...REGIONS].sort((a, b) => lk[b].revenue - lk[a].revenue).map((r) => [r, `$${lk[r].revenue.toFixed(2)}`, lk[r].purchase.toLocaleString()])
    : query === "funnel" ? TYPES.map((t) => [t, REGIONS.reduce((a, r) => a + lk[r][t], 0).toLocaleString()])
    : REGIONS.map((r) => [r, lk[r].view ? ((100 * lk[r].purchase) / lk[r].view).toFixed(2) : "0.00"]);
  const capRate = shards * Math.min(1000, 1024 / sizeKB);
  const thrPct = totals.accepted + totals.throttled ? (100 * totals.throttled) / (totals.accepted + totals.throttled) : 0;

  return (
    <>
      <PageHeader eyebrow="Capstone 06 · Data Engineering" title={P.title} subtitle={P.pitch}
        right={<>
          <Button variant="ghost" onClick={reset}><RotateCcw size={14} /> Reset</Button>
          <Button onClick={() => setRunning(!running)}>{running ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}</Button>
        </>} />
      <DemoNotice stack={P.services} folder={P.folder}>
        A simulated producer writes clickstream events into Kinesis. Shard limits match the real service (1,000 records/s or 1 MB/s of writes per shard),
        so pushing the producer rate or record size past capacity causes ProvisionedThroughputExceeded throttling. Spark aggregates 10-second tumbling
        windows into Parquet on S3, and Athena queries are priced at $5 per TB scanned with the 10 MB per-query minimum.
      </DemoNotice>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Ingest capacity" value={`${Math.round(capRate).toLocaleString()}/s`} hint={`${shards} shard${shards > 1 ? "s" : ""}`} tone="cyan" />
        <Stat label="Records accepted" value={totals.accepted.toLocaleString()} tone="pos" />
        <Stat label="Throttled" value={`${thrPct.toFixed(1)}%`} tone={thrPct > 1 ? "neg" : undefined} hint={`${totals.throttled.toLocaleString()} records`} />
        <Stat label="Parquet files in S3" value={files.length} hint={fmtBytes(lakeBytes)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card title="Producer & stream">
          <div className="space-y-4">
            <Slider label="Producer rate" value={rate} min={200} max={8000} step={100} onChange={setRate} format={(v) => `${v.toLocaleString()} rec/s`} />
            <Slider label="Avg record size" value={sizeKB} min={0.5} max={10} step={0.5} onChange={setSizeKB} format={(v) => `${v} KB`} />
            <Slider label="Shards" value={shards} min={1} max={8} onChange={setShards} />
            <Toggle label="Low-cardinality partition key" hint="Creates a hot shard" checked={hotKey} onChange={setHotKey} />
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-wide text-gray-500">Shard utilisation</div>
              <div className="space-y-1.5">
                {shardLoad.map((u, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="w-14 font-mono text-gray-500">shard-{i}</span>
                    <Meter value={Math.min(u, 1)} color={u > 1 ? "#EF4444" : u > 0.8 ? "#F59E0B" : "#10B981"} />
                    <span className={clsx("w-10 text-right font-mono", u > 1 ? "text-crimson-light" : "text-gray-400")}>{Math.round(u * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
        <div className="min-w-0 space-y-4">
          <Card title="Kinesis throughput (records/s)" right={running ? <Badge tone="emerald">streaming</Badge> : <Badge>paused</Badge>}>
            <LineChart series={[{ label: "Incoming", values: series.inc, color: "#A78BFA" }, { label: "Accepted", values: series.acc, color: "#10B981" }, { label: "Throttled", values: series.thr, color: "#EF4444" }]} height={170} />
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Spark · 10 s tumbling windows" pad={false}>
              <table className="w-full text-xs">
                <thead><tr className="text-left text-[10px] uppercase tracking-wide text-gray-500"><th className="px-3 py-2 font-medium">Window</th><th className="px-3 py-2 text-right font-medium">Events</th><th className="px-3 py-2 text-right font-medium">Orders</th><th className="px-3 py-2 text-right font-medium">Revenue</th></tr></thead>
                <tbody className="font-mono">
                  {windows.length === 0 && <tr><td colSpan={4} className="px-3 py-3 font-sans text-gray-500">First window closes after 10 s...</td></tr>}
                  {windows.map((w) => (
                    <tr key={w.end} className="animate-rise border-t border-glass">
                      <td className="px-3 py-1.5 text-gray-400">#{w.end}</td><td className="px-3 py-1.5 text-right">{w.events.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right">{w.purchases.toLocaleString()}</td><td className="px-3 py-1.5 text-right text-emerald-light">${Math.round(w.revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title="Live tail · shard iterator">
              <div className="space-y-1 font-mono text-[10.5px] text-gray-400">
                {tail.map((t, i) => <div key={t + i} className="animate-rise truncate">{t}</div>)}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Athena query editor" right={<Database size={13} className="text-gray-500" />}>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {QUERIES.map((x) => (
              <button key={x.key} onClick={() => setQuery(x.key)} className={clsx("rounded-full border px-2.5 py-1 text-[11px]", query === x.key ? "border-violet/50 bg-violet/15 text-violet-light" : "border-glass text-gray-400")}>{x.label}</button>
            ))}
          </div>
          <Code>{q.sql}</Code>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] text-gray-500">{headers.map((h) => <th key={h} className="px-2 py-1 font-mono font-medium">{h}</th>)}</tr></thead>
              <tbody className="font-mono text-xs">
                {rows.map((r, i) => <tr key={i} className="border-t border-glass">{r.map((c, j) => <td key={j} className="px-2 py-1.5 text-gray-200">{c}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
            <span>Data scanned: <span className="font-mono text-gray-300">{fmtBytes(scanned)}</span> ({Math.round(q.cols * 100)}% of columns)</span>
            <span>Billed: <span className="font-mono text-gray-300">{fmtBytes(billed)}</span></span>
            <span>Cost: <span className="font-mono text-emerald-light">${((billed / 1024 ** 4) * 5).toFixed(7)}</span></span>
          </div>
        </Card>
        <Card title="S3 data lake (Parquet, partitioned by dt/hour)" pad={false}>
          <div className="max-h-[360px] overflow-auto p-3 font-mono text-[11px]">
            {files.length === 0 && <div className="p-3 font-sans text-sm text-gray-500">Spark writes a file when each window closes.</div>}
            {files.map((f) => (
              <div key={f.path} className="animate-rise flex gap-3 rounded px-2 py-1 hover:bg-white/[0.03]">
                <span className="min-w-0 flex-1 truncate text-gray-400">{f.path}</span>
                <span className="text-gray-500">{f.rows.toLocaleString()} rows</span>
                <span className="w-20 text-right text-gray-300">{fmtBytes(f.bytes)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
