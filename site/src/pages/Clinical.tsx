import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCopy, Loader2, Play } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card, DemoNotice, PageHeader, TextArea, Toggle } from "../components/ui";
import { TRANSCRIPTS, extract, parse, redact, soap, type EntityType } from "../lib/clinical";
import { PROJECTS } from "../data/projects";

const P = PROJECTS.find((p) => p.key === "clinical")!;
const COLORS: Record<EntityType, string> = {
  MEDICAL_CONDITION: "bg-crimson/20 text-crimson-light", MEDICATION: "bg-emerald/20 text-emerald-light", DOSAGE: "bg-emerald/10 text-emerald-light",
  TEST_TREATMENT_PROCEDURE: "bg-cyan/20 text-cyan-light", ANATOMY: "bg-amber/20 text-amber-light", PHI: "bg-violet/30 text-violet-light",
};
const STEPS = ["Transcribe Medical · diarization", "Comprehend Medical · DetectEntitiesV2", "Comprehend Medical · DetectPHI", "Bedrock · SOAP note draft"];

function Annotated({ text, hidePhi }: { text: string; hidePhi: boolean }) {
  const ents = extract(text);
  const out: JSX.Element[] = [];
  let pos = 0;
  ents.forEach((e, i) => {
    if (e.start > pos) out.push(<span key={`t${i}`}>{text.slice(pos, e.start)}</span>);
    out.push(<mark key={`e${i}`} title={e.sub ?? e.type} className={clsx("rounded px-0.5", COLORS[e.type])}>{e.type === "PHI" && hidePhi ? `[${e.sub}]` : e.text}</mark>);
    pos = e.end;
  });
  out.push(<span key="end">{text.slice(pos)}</span>);
  return <>{out}</>;
}

export function Clinical() {
  const [text, setText] = useState(TRANSCRIPTS[0].text);
  const [step, setStep] = useState(STEPS.length);
  const [hidePhi, setHidePhi] = useState(true);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (step >= STEPS.length) return;
    const id = setTimeout(() => setStep((s) => s + 1), 550);
    return () => clearTimeout(id);
  }, [step]);

  const turns = useMemo(() => parse(text), [text]);
  const note = useMemo(() => soap(turns), [turns]);
  const counts = useMemo(() => {
    const c: Partial<Record<EntityType, number>> = {};
    for (const e of extract(text)) c[e.type] = (c[e.type] ?? 0) + 1;
    return c;
  }, [text]);
  const done = step >= STEPS.length;
  const r = (s: string) => (hidePhi ? redact(s) : s);
  const noteText = [
    "SUBJECTIVE", `Chief complaint: ${note.S.complaint.join(", ") || "n/a"}`, ...note.S.hpi.map((s) => `- ${r(s)}`), ...note.S.meds.map((s) => `- Current meds: ${r(s)}`), "",
    "OBJECTIVE", `Vitals: ${note.O.vitals.join(", ") || "not recorded"}`, ...note.O.exam.map((s) => `- ${r(s)}`), "",
    "ASSESSMENT", ...note.A.map((a) => `- ${a}`), "",
    "PLAN", ...note.P.meds.map((s) => `- Rx: ${r(s)}`), ...(note.P.tests.length ? [`- Orders: ${note.P.tests.join(", ")}`] : []), ...note.P.follow.map((s) => `- ${r(s)}`),
  ].join("\n");

  return (
    <>
      <PageHeader eyebrow="Capstone 07 · Healthcare AI" title={P.title} subtitle={P.pitch} />
      <DemoNotice stack={P.services} folder={P.folder}>
        Paste or edit a doctor-patient transcript (fictional data). Entity and PHI extraction use a medical dictionary and patterns that mirror
        Comprehend Medical categories; the SOAP note is assembled from those entities so every line traces back to the conversation. The repository
        version runs Transcribe Medical, Comprehend Medical and a Bedrock model. Not for clinical use.
      </DemoNotice>

      <Card pad={false}>
        <div className="grid gap-px overflow-hidden rounded-xl bg-glass sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 bg-surface px-4 py-3 text-xs">
              {i < step ? <CheckCircle2 size={15} className="shrink-0 text-emerald-light" /> : i === step ? <Loader2 size={15} className="shrink-0 animate-spin text-violet-light" /> : <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-gray-600" />}
              <span className={i <= step ? "text-gray-200" : "text-gray-500"}>{s}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <Card title="Transcript" right={<Button onClick={() => setStep(0)}><Play size={13} /> Run pipeline</Button>}>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {TRANSCRIPTS.map((t) => (
                <button key={t.label} onClick={() => { setText(t.text); setStep(0); }}
                  className={clsx("rounded-full border px-2.5 py-1 text-[11px]", text === t.text ? "border-violet/50 bg-violet/15 text-violet-light" : "border-glass text-gray-400")}>{t.label}</button>
              ))}
            </div>
            <TextArea value={text} onChange={setText} rows={7} className="font-mono text-xs" />
          </Card>
          <Card title="Annotated conversation" right={<Toggle label="Redact PHI" checked={hidePhi} onChange={setHidePhi} />}>
            <div className="space-y-2.5">
              {turns.map((t, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <Badge tone={t.speaker === "DOCTOR" ? "violet" : "gray"} className="h-fit w-16 justify-center">{t.speaker === "DOCTOR" ? "spk_0" : "spk_1"}</Badge>
                  <p className="leading-relaxed text-gray-300"><Annotated text={t.text} hidePhi={hidePhi} /></p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(Object.keys(COLORS) as EntityType[]).map((k) => (
                <span key={k} className={clsx("rounded px-1.5 py-0.5 font-mono text-[10px]", COLORS[k])}>{k} · {counts[k] ?? 0}</span>
              ))}
            </div>
          </Card>
        </div>

        <Card title="Generated SOAP note" right={done && (
          <button onClick={() => { navigator.clipboard?.writeText(noteText); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200"><ClipboardCopy size={12} />{copied ? "Copied" : "Copy"}</button>
        )}>
          {!done ? (
            <div className="flex h-60 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> {STEPS[step]}...</div>
          ) : (
            <div className="animate-rise space-y-4 text-sm">
              {[
                { k: "S", title: "Subjective", body: <>
                  <div className="text-gray-400">Chief complaint: <span className="text-gray-100">{note.S.complaint.join(", ") || "n/a"}</span></div>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-gray-300">{note.S.hpi.map((s) => <li key={s}>{r(s)}</li>)}{note.S.meds.map((s) => <li key={s}>Current meds: {r(s)}</li>)}</ul></> },
                { k: "O", title: "Objective", body: <>
                  <div className="flex flex-wrap gap-1.5">{note.O.vitals.length ? note.O.vitals.map((v) => <Badge key={v} tone="cyan">{v}</Badge>) : <span className="text-gray-500">No vitals recorded</span>}</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-300">{note.O.exam.map((s) => <li key={s}>{r(s)}</li>)}</ul></> },
                { k: "A", title: "Assessment", body: <div className="flex flex-wrap gap-1.5">{note.A.map((a) => <Badge key={a} tone="crimson">{a}</Badge>)}</div> },
                { k: "P", title: "Plan", body: <ul className="list-disc space-y-1 pl-5 text-gray-300">
                  {note.P.meds.map((s) => <li key={s}><span className="text-emerald-light">Rx:</span> {r(s)}</li>)}
                  {note.P.tests.length > 0 && <li><span className="text-cyan-light">Orders:</span> {note.P.tests.join(", ")}</li>}
                  {note.P.follow.map((s) => <li key={s}>{r(s)}</li>)}</ul> },
              ].map((sec) => (
                <div key={sec.k} className="flex gap-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-violet/15 font-mono text-sm text-violet-light">{sec.k}</div>
                  <div className="min-w-0 flex-1"><div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">{sec.title}</div>{sec.body}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
