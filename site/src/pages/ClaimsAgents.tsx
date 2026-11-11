import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bot, CircleCheck, CircleX, Play, RotateCcw, UserRoundSearch, Wrench } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card, DemoNotice, Input, PageHeader, Pills, Slider, TextArea } from "../components/ui";
import { AGENTS, POLICIES, SCENARIOS, runClaim, type Claim, type ClaimType, type TraceEvent } from "../lib/claims";
import { PROJECTS } from "../data/projects";

const P = PROJECTS.find((p) => p.key === "claims")!;
const KIND: Record<TraceEvent["kind"], { tone: "violet" | "cyan" | "emerald" | "amber" | "gray"; label: string }> = {
  think: { tone: "gray", label: "thought" }, tool: { tone: "cyan", label: "tool_call" }, result: { tone: "violet", label: "result" },
  handoff: { tone: "amber", label: "handoff" }, decision: { tone: "emerald", label: "decision" },
};

export function ClaimsAgents() {
  const [claim, setClaim] = useState<Claim>(SCENARIOS[0].claim);
  const [scenario, setScenario] = useState(SCENARIOS[0].label);
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(450);
  const result = useMemo(() => runClaim(claim), [claim]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!running) return;
    if (shown >= result.trace.length) { setRunning(false); return; }
    const id = setTimeout(() => setShown((s) => s + 1), speed);
    return () => clearTimeout(id);
  }, [running, shown, result.trace.length, speed]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [shown]);

  const set = <K extends keyof Claim>(k: K, v: Claim[K]) => { setClaim((c) => ({ ...c, [k]: v })); setShown(0); setRunning(false); };
  const start = () => { setShown(0); setRunning(true); };
  const done = shown >= result.trace.length;
  const active = !done && shown > 0 ? result.trace[shown - 1].agent : null;
  const visited = new Set(result.trace.slice(0, shown).map((e) => e.agent));
  const d = result.decision;

  return (
    <>
      <PageHeader eyebrow="Capstone 02 · Agentic AI" title={P.title} subtitle={P.pitch} />
      <DemoNotice stack={P.services} folder={P.folder}>
        Pick a scenario or edit the claim, then run the agents. The supervisor delegates to four specialist agents and each tool call
        is logged as it would appear in AgentCore Observability. Agent reasoning is rule-based here so the demo is deterministic
        and free to run; the repository version uses Strands agents on Bedrock.
      </DemoNotice>

      <Card pad={false}>
        <div className="flex items-stretch gap-1 overflow-x-auto p-4">
          {AGENTS.map((a, i) => (
            <div key={a.key} className="flex items-center gap-1">
              <div className={clsx("w-36 shrink-0 rounded-xl border p-3 transition-all duration-300",
                active === a.key ? "border-emerald/60 bg-emerald/10 shadow-[0_0_24px_-6px_rgba(16,185,129,0.6)]" :
                visited.has(a.key) ? "border-white/15 bg-white/[0.03]" : "border-glass bg-obsidian/40 opacity-60")}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Bot size={15} className={active === a.key ? "text-emerald-light" : "text-gray-500"} />{a.label}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">{a.role}</div>
                <div className="mt-2 font-mono text-[10px] text-gray-500">
                  {result.trace.slice(0, shown).filter((e) => e.agent === a.key && e.kind === "tool").length} tool calls
                </div>
              </div>
              {i < AGENTS.length - 1 && <ArrowRight size={14} className={clsx("shrink-0", visited.has(AGENTS[i + 1].key) ? "text-emerald-light" : "text-gray-700")} />}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card title="Claim submission">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS.map((s) => (
                <button key={s.label} onClick={() => { setScenario(s.label); setClaim(s.claim); setShown(0); setRunning(false); }}
                  className={clsx("rounded-full border px-2.5 py-1 text-[11px]", scenario === s.label ? "border-violet/50 bg-violet/15 text-violet-light" : "border-glass text-gray-400")}>
                  {s.label}
                </button>
              ))}
            </div>
            <label className="block text-xs text-gray-400">Claimant<Input value={claim.claimant} onChange={(v) => set("claimant", v)} className="mt-1 w-full" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-gray-400">Policy
                <select value={claim.policy} onChange={(e) => set("policy", e.target.value)}
                  className="mt-1 w-full rounded-md border border-glass bg-obsidian/60 px-2 py-1.5 text-sm">
                  {Object.keys(POLICIES).map((k) => <option key={k}>{k}</option>)}
                </select>
              </label>
              <label className="block text-xs text-gray-400">Amount ($)<Input type="number" value={claim.amount} onChange={(v) => set("amount", Number(v) || 0)} className="mt-1 w-full" /></label>
              <label className="block text-xs text-gray-400">Incident<Input type="date" value={claim.incidentDate} onChange={(v) => set("incidentDate", v)} className="mt-1 w-full" /></label>
              <label className="block text-xs text-gray-400">Reported<Input type="date" value={claim.reportedDate} onChange={(v) => set("reportedDate", v)} className="mt-1 w-full" /></label>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">Type
              <Pills value={claim.type} onChange={(v: ClaimType) => set("type", v)} options={[{ key: "auto", label: "Auto" }, { key: "home", label: "Home" }, { key: "health", label: "Health" }]} />
            </div>
            <Slider label="Prior claims" value={claim.priorClaims} min={0} max={6} onChange={(v) => set("priorClaims", v)} />
            <label className="block text-xs text-gray-400">Description<TextArea value={claim.description} onChange={(v) => set("description", v)} rows={4} className="mt-1" /></label>
            <div className="flex items-center gap-2">
              <Button onClick={start} disabled={running} className="flex-1"><Play size={14} /> Run agents</Button>
              <Button variant="ghost" onClick={() => { setShown(result.trace.length); setRunning(false); }}>Skip</Button>
              <Button variant="ghost" onClick={() => { setShown(0); setRunning(false); }}><RotateCcw size={14} /></Button>
            </div>
            <Slider label="Step delay" value={speed} min={100} max={1200} step={50} onChange={setSpeed} format={(v) => `${v} ms`} />
          </div>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card title="Agent trace" right={<span className="font-mono text-[11px] text-gray-500">{shown}/{result.trace.length} events</span>} pad={false}>
            <div ref={logRef} className="h-80 overflow-auto p-3 font-mono text-[12px]">
              {shown === 0 && <div className="p-6 text-center font-sans text-sm text-gray-500">Press <b>Run agents</b> to start the workflow.</div>}
              {result.trace.slice(0, shown).map((e, i) => (
                <div key={i} className="animate-rise flex gap-2 rounded px-2 py-1 hover:bg-white/[0.03]">
                  <span className="w-6 shrink-0 text-gray-600">{String(i + 1).padStart(2, "0")}</span>
                  <span className="w-24 shrink-0 text-gray-400">{e.agent}</span>
                  <Badge tone={KIND[e.kind].tone} className="h-fit shrink-0">{e.kind === "tool" && <Wrench size={10} />}{KIND[e.kind].label}</Badge>
                  <span className={clsx("min-w-0 break-words", e.kind === "decision" ? "text-emerald-light" : "text-gray-300")}>{e.text}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Decision">
            {!done ? <div className="text-sm text-gray-500">Waiting for the adjudication agent...</div> : (
              <div className="animate-rise grid gap-4 md:grid-cols-[220px_1fr]">
                <div className={clsx("rounded-xl border p-4",
                  d.outcome === "APPROVED" ? "border-emerald/40 bg-emerald/10" : d.outcome === "DENIED" ? "border-crimson/40 bg-crimson/10" : "border-amber/40 bg-amber/10")}>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {d.outcome === "APPROVED" ? <CircleCheck size={16} className="text-emerald-light" /> : d.outcome === "DENIED" ? <CircleX size={16} className="text-crimson-light" /> : <UserRoundSearch size={16} className="text-amber-light" />}
                    {d.outcome.replace("_", " ")}
                  </div>
                  <div className="mt-2 font-mono text-2xl">${d.payout.toLocaleString("en-US")}</div>
                  <div className="text-[11px] text-gray-400">{d.outcome === "HUMAN_REVIEW" ? "proposed payout, pending review" : "payout"}</div>
                  <p className="mt-2 text-xs text-gray-300">{d.reason}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400"><span>Fraud risk score</span><span className="font-mono text-gray-200">{d.fraud}/100</span></div>
                  <div className="relative mt-1.5 h-2 rounded-full bg-gradient-to-r from-emerald via-amber to-crimson">
                    <div className="absolute -top-1 h-4 w-1 rounded bg-white shadow" style={{ left: `calc(${d.fraud}% - 2px)` }} />
                  </div>
                  <div className="mt-3 space-y-1">
                    {d.signals.length === 0 && <div className="text-xs text-gray-500">No risk signals detected.</div>}
                    {d.signals.map((s) => (
                      <div key={s.label} className="flex items-center gap-2 text-xs">
                        <span className={clsx("w-9 font-mono", s.pts > 0 ? "text-crimson-light" : "text-emerald-light")}>{s.pts > 0 ? "+" : ""}{s.pts}</span>
                        <span className="text-gray-300">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
