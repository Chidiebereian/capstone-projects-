import { useMemo, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { Badge, Card, Code, DemoNotice, Input, PageHeader, Pills, TextArea, Toggle } from "../components/ui";
import { DEFAULT_CONFIG, PII_TYPES, PRESETS, evaluate, type Config, type PiiAction, type Span } from "../lib/guardrails";
import { PROJECTS } from "../data/projects";

const P = PROJECTS.find((p) => p.key === "guardrails")!;
const KIND_STYLE: Record<Span["kind"], string> = {
  pii: "bg-cyan/20 text-cyan-light", topic: "bg-amber/20 text-amber-light", word: "bg-crimson/20 text-crimson-light", attack: "bg-crimson/25 text-crimson-light",
};

function Marked({ text, spans }: { text: string; spans: Span[] }) {
  const out: JSX.Element[] = [];
  let pos = 0;
  spans.forEach((s, i) => {
    if (s.start > pos) out.push(<span key={`t${i}`}>{text.slice(pos, s.start)}</span>);
    out.push(<mark key={`m${i}`} title={s.type} className={clsx("rounded px-0.5", KIND_STYLE[s.kind])}>{text.slice(s.start, s.end)}</mark>);
    pos = s.end;
  });
  out.push(<span key="end">{text.slice(pos)}</span>);
  return <>{out}</>;
}

export function Guardrails() {
  const [text, setText] = useState(PRESETS[0].text);
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [words, setWords] = useState(DEFAULT_CONFIG.words.join(", "));
  const r = useMemo(() => evaluate(text, { ...cfg, words: words.split(",") }), [text, cfg, words]);

  return (
    <>
      <PageHeader eyebrow="Capstone 03 · Responsible AI" title={P.title} subtitle={P.pitch} />
      <DemoNotice stack={P.services} folder={P.folder}>
        Type any prompt or pick a preset, then change the policy on the right. Detection runs on every keystroke and returns the same
        response shape as the Bedrock ApplyGuardrail API. PII uses regex plus a Luhn check for card numbers; topics and prompt attacks use
        keyword and pattern rules (Bedrock uses ML classifiers for these).
      </DemoNotice>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Card title="Model input">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => setText(p.text)}
                  className={clsx("rounded-full border px-2.5 py-1 text-[11px]", text === p.text ? "border-violet/50 bg-violet/15 text-violet-light" : "border-glass text-gray-400 hover:text-gray-200")}>
                  {p.label}
                </button>
              ))}
            </div>
            <TextArea value={text} onChange={setText} rows={4} />
          </Card>

          <div className={clsx("flex items-center gap-3 rounded-xl border px-4 py-3",
            r.blocked ? "border-crimson/40 bg-crimson/10" : r.action === "NONE" ? "border-emerald/40 bg-emerald/10" : "border-amber/40 bg-amber/10")}>
            {r.blocked ? <ShieldAlert className="text-crimson-light" size={20} /> : <ShieldCheck className={r.action === "NONE" ? "text-emerald-light" : "text-amber-light"} size={20} />}
            <div>
              <div className="font-mono text-sm">{r.action}</div>
              <div className="text-xs text-gray-400">
                {r.blocked ? "Request blocked before reaching the model." : r.action === "NONE" ? "No policy matched; request forwarded unchanged." : "Sensitive data masked; sanitized request forwarded to the model."}
              </div>
            </div>
            <span className="ml-auto font-mono text-xs text-gray-400">{r.findings.length} findings</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Detections">
              <p className="text-sm leading-relaxed text-gray-200"><Marked text={text} spans={r.spans} /></p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
                <span className="rounded bg-cyan/20 px-1 text-cyan-light">PII</span>
                <span className="rounded bg-amber/20 px-1 text-amber-light">denied topic</span>
                <span className="rounded bg-crimson/20 px-1 text-crimson-light">word / attack</span>
              </div>
            </Card>
            <Card title="Forwarded to model">
              <p className={clsx("text-sm leading-relaxed", r.blocked ? "text-crimson-light" : "text-gray-200")}>{r.output}</p>
            </Card>
          </div>

          <Card title="Assessments" pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2 font-medium">Policy</th><th className="px-4 py-2 font-medium">Type</th><th className="px-4 py-2 font-medium">Match</th><th className="px-4 py-2 font-medium">Action</th></tr></thead>
                <tbody>
                  {r.findings.length === 0 && <tr><td colSpan={4} className="px-4 py-3 text-gray-500">No findings.</td></tr>}
                  {r.findings.map((f, i) => (
                    <tr key={i} className="border-t border-glass">
                      <td className="px-4 py-2 font-mono text-xs text-gray-400">{f.policy}</td>
                      <td className="px-4 py-2 text-gray-200">{f.type}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-300">{f.match}</td>
                      <td className="px-4 py-2"><Badge tone={f.action === "BLOCKED" ? "crimson" : "cyan"}>{f.action}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="ApplyGuardrail response (JSON)"><Code>{JSON.stringify(r.response, null, 2)}</Code></Card>
        </div>

        <div className="space-y-4">
          <Card title="Sensitive information filters">
            <div className="space-y-2">
              {PII_TYPES.map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-gray-300" title={t}>{t}</span>
                  <Pills value={cfg.pii[t]} onChange={(v: PiiAction) => setCfg({ ...cfg, pii: { ...cfg.pii, [t]: v } })}
                    options={[{ key: "OFF", label: "Off" }, { key: "ANONYMIZE", label: "Mask" }, { key: "BLOCK", label: "Block" }]} />
                </div>
              ))}
            </div>
          </Card>
          <Card title="Denied topics">
            {cfg.topics.map((tp, i) => (
              <Toggle key={tp.name} label={tp.name} hint={tp.definition} checked={tp.enabled}
                onChange={(v) => setCfg({ ...cfg, topics: cfg.topics.map((x, j) => (j === i ? { ...x, enabled: v } : x)) })} />
            ))}
          </Card>
          <Card title="Content & word filters">
            <Toggle label="Prompt attack filter" hint="Injection, jailbreak and prompt extraction" checked={cfg.promptAttack} onChange={(v) => setCfg({ ...cfg, promptAttack: v })} />
            <Toggle label="Profanity (managed list)" checked={cfg.profanity} onChange={(v) => setCfg({ ...cfg, profanity: v })} />
            <label className="mt-2 block px-2 text-xs text-gray-400">Custom blocked words (comma separated)
              <Input value={words} onChange={setWords} className="mt-1 w-full" />
            </label>
          </Card>
        </div>
      </div>
    </>
  );
}
