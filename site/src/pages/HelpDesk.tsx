import { useEffect, useRef, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import clsx from "clsx";
import { Badge, Card, Code, DemoNotice, Input, Meter, PageHeader, Button } from "../components/ui";
import { INTENTS, classify, detectSentiment, priorityFor, type Sentiment } from "../lib/helpdesk";
import { PROJECTS } from "../data/projects";

const P = PROJECTS.find((p) => p.key === "helpdesk")!;
type Msg = { from: "user" | "bot"; text: string; options?: string[] };
type Ticket = { id: string; summary: string; intent: string; priority: string; team: string; sentiment: string; status: string };
const SAMPLES = ["I'm locked out of my account again, this is so frustrating!", "My VPN keeps disconnecting", "My laptop screen is cracked", "I need access to Tableau", "What's the status of INC-1042?", "Can you order me lunch?"];
const MENU = ["Password reset", "VPN problem", "Broken laptop", "Software access"];

export function HelpDesk() {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "Hi! I'm the IT help desk assistant. Describe your issue and I'll fix it or open a ticket." }]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<{ intent: string; slots: Record<string, string>; sentiment: Sentiment; utterance: string } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([
    { id: "INC-1042", summary: "Printer on 3rd floor offline", intent: "HardwareFailure", priority: "P3", team: "Field Services", sentiment: "NEUTRAL", status: "In progress" },
  ]);
  const [event, setEvent] = useState<object>({});
  const [lastSent, setLastSent] = useState<Sentiment | null>(null);
  const [ranked, setRanked] = useState<{ name: string; score: number }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs]);

  const say = (text: string, options?: string[]) => setMsgs((m) => [...m, { from: "bot", text, options }]);

  const fulfil = (intentName: string, slots: Record<string, string>, sentiment: Sentiment, utterance: string) => {
    const intent = INTENTS.find((i) => i.name === intentName)!;
    const priority = priorityFor(intent, slots, sentiment);
    const id = `INC-${1043 + tickets.length - 1}`;
    const auto = intent.resolve?.(slots);
    setTickets((t) => [{ id, summary: utterance.slice(0, 60), intent: intentName, priority, team: intent.team, sentiment: sentiment.sentiment, status: auto ? "Resolved by bot" : "Open" }, ...t]);
    say(auto ? `${auto} I've logged this as ${id} and marked it resolved.` :
      `Ticket ${id} created with priority ${priority} and routed to ${intent.team}.${sentiment.sentiment === "NEGATIVE" ? " I raised the priority because this sounds frustrating, sorry about that." : ""}`);
    return { state: "Fulfilled", priority, id };
  };

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    setInput("");
    setMsgs((m) => [...m, { from: "user", text }]);
    const sentiment = detectSentiment(text);
    setLastSent(sentiment);

    if (pending) {
      const intent = INTENTS.find((i) => i.name === pending.intent)!;
      const slot = intent.slots.find((s) => !pending.slots[s.name])!;
      const val = slot.options?.find((o) => text.toLowerCase().includes(o.toLowerCase())) ?? text;
      const slots = { ...pending.slots, [slot.name]: val };
      const next = intent.slots.find((s) => !slots[s.name]);
      const worst = sentiment.sentiment === "NEGATIVE" ? sentiment : pending.sentiment;
      if (next) {
        setPending({ ...pending, slots, sentiment: worst });
        setEvent({ sessionState: { dialogAction: { type: "ElicitSlot", slotToElicit: next.name }, intent: { name: intent.name, slots, state: "InProgress" } }, inputTranscript: text });
        say(next.prompt, next.options);
      } else {
        setPending(null);
        const f = fulfil(intent.name, slots, worst, pending.utterance);
        setEvent({ sessionState: { dialogAction: { type: "Close" }, intent: { name: intent.name, slots, state: f.state } }, inputTranscript: text, ticket: { id: f.id, priority: f.priority } });
      }
      return;
    }

    const menuMap: Record<string, string> = { "Password reset": "reset my password", "VPN problem": "vpn issue", "Broken laptop": "broken laptop", "Software access": "need access to software" };
    const c = classify(menuMap[text] ?? text);
    setRanked(c.ranked);
    const base = { interpretations: c.ranked.map((r) => ({ intent: { name: r.name }, nluConfidence: Number(r.score.toFixed(2)) })),
      sentimentResponse: { sentiment: sentiment.sentiment, sentimentScore: Object.fromEntries(Object.entries(sentiment.scores).map(([k, v]) => [k.toLowerCase(), Number(v.toFixed(3))])) }, inputTranscript: text };
    if (c.top === "Greeting") { say("Hello! What can I help you with today?", MENU); setEvent({ ...base, sessionState: { dialogAction: { type: "Close" }, intent: { name: "Greeting", state: "Fulfilled" } } }); return; }
    if (c.top === "TicketStatus") {
      const id = text.toUpperCase().match(/INC-\d+/)?.[0];
      const t = tickets.find((x) => x.id === id);
      say(t ? `${t.id} "${t.summary}" is ${t.status.toLowerCase()} with ${t.team} (priority ${t.priority}).` : "I couldn't find that ticket number. Ticket IDs look like INC-1042.");
      setEvent({ ...base, sessionState: { dialogAction: { type: "Close" }, intent: { name: "TicketStatus", slots: { ticketId: id ?? null }, state: "Fulfilled" } } });
      return;
    }
    if (c.top === "FallbackIntent") {
      say("I can help with passwords, VPN, hardware and software access. Could you rephrase, or pick one?", MENU);
      setEvent({ ...base, sessionState: { dialogAction: { type: "ElicitIntent" }, intent: { name: "FallbackIntent", state: "Failed" } } });
      return;
    }
    const intent = INTENTS.find((i) => i.name === c.top)!;
    const slots: Record<string, string> = {};
    for (const s of intent.slots) { const o = s.options?.find((x) => text.toLowerCase().includes(x.toLowerCase())); if (o) slots[s.name] = o; }
    if (intent.name === "HardwareFailure" && !slots.urgency && sentiment.sentiment === "NEGATIVE") slots.urgency = "High";
    const next = intent.slots.find((s) => !slots[s.name]);
    if (next) {
      setPending({ intent: intent.name, slots, sentiment, utterance: text });
      setEvent({ ...base, sessionState: { dialogAction: { type: "ElicitSlot", slotToElicit: next.name }, intent: { name: intent.name, slots, state: "InProgress" } } });
      say(next.prompt, next.options);
    } else {
      const f = fulfil(intent.name, slots, sentiment, text);
      setEvent({ ...base, sessionState: { dialogAction: { type: "Close" }, intent: { name: intent.name, slots, state: f.state } } });
    }
  };

  const PRI_TONE: Record<string, "crimson" | "amber" | "cyan" | "gray"> = { P1: "crimson", P2: "amber", P3: "cyan", P4: "gray" };
  return (
    <>
      <PageHeader eyebrow="Capstone 05 · AWS AI Services" title={P.title} subtitle={P.pitch} />
      <DemoNotice stack={P.services} folder={P.folder}>
        Chat with the bot: it classifies intent, asks for missing slots, scores sentiment and opens prioritised tickets. The inspector shows the
        Lex V2 session state your Lambda fulfillment function would receive. Intent and sentiment models are keyword-based in this demo; the
        repository version uses Lex NLU and Amazon Comprehend.
      </DemoNotice>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card title="Conversation" pad={false}>
          <div className="flex h-[460px] flex-col">
            <div className="flex-1 space-y-3 overflow-auto p-4">
              {msgs.map((m, i) => (
                <div key={i} className={clsx("animate-rise flex gap-2", m.from === "user" && "flex-row-reverse")}>
                  <div className={clsx("grid h-7 w-7 shrink-0 place-items-center rounded-full", m.from === "bot" ? "bg-violet/20 text-violet-light" : "bg-white/10 text-gray-300")}>
                    {m.from === "bot" ? <Bot size={14} /> : <User size={14} />}
                  </div>
                  <div className="max-w-[80%]">
                    <div className={clsx("rounded-2xl px-3 py-2 text-sm", m.from === "bot" ? "rounded-tl-sm bg-raised text-gray-200" : "rounded-tr-sm bg-violet text-white")}>{m.text}</div>
                    {m.options && i === msgs.length - 1 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {m.options.map((o) => <button key={o} onClick={() => send(o)} className="rounded-full border border-violet/40 px-2.5 py-0.5 text-[11px] text-violet-light hover:bg-violet/15">{o}</button>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="border-t border-glass p-3">
              <div className="mb-2 flex flex-wrap gap-1">
                {SAMPLES.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-glass px-2 py-0.5 text-[11px] text-gray-400 hover:text-gray-200">{s}</button>)}
              </div>
              <div className="flex gap-2">
                <Input value={input} onChange={setInput} onEnter={() => send()} placeholder="Describe your IT issue..." className="flex-1" />
                <Button onClick={() => send()}><Send size={14} /></Button>
              </div>
            </div>
          </div>
        </Card>
        <div className="min-w-0 space-y-4">
          <Card title="NLU & sentiment">
            <div className="space-y-2">
              {ranked.length === 0 && <div className="text-xs text-gray-500">Send a message to see intent confidence.</div>}
              {ranked.map((r) => (
                <div key={r.name}>
                  <div className="flex justify-between text-xs"><span className="font-mono text-gray-300">{r.name}</span><span className="font-mono text-gray-500">{r.score.toFixed(2)}</span></div>
                  <Meter value={r.score} color="#60A5FA" />
                </div>
              ))}
              {lastSent && (
                <div className="pt-2">
                  <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">Sentiment <Badge tone={lastSent.sentiment === "NEGATIVE" ? "crimson" : lastSent.sentiment === "POSITIVE" ? "emerald" : "gray"}>{lastSent.sentiment}</Badge></div>
                  <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px] text-gray-500">
                    {Object.entries(lastSent.scores).map(([k, v]) => <div key={k}><div className="text-gray-300">{v.toFixed(2)}</div>{k}</div>)}
                  </div>
                </div>
              )}
            </div>
          </Card>
          <Card title="Lex V2 event inspector"><Code>{JSON.stringify(event, null, 2)}</Code></Card>
        </div>
      </div>
      <Card title={`Ticket queue · ${tickets.length}`} pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
              {["Ticket", "Summary", "Intent", "Priority", "Team", "Sentiment", "Status"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="animate-rise border-t border-glass">
                  <td className="px-4 py-2 font-mono text-xs text-violet-light">{t.id}</td>
                  <td className="max-w-xs truncate px-4 py-2 text-gray-200">{t.summary}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{t.intent}</td>
                  <td className="px-4 py-2"><Badge tone={PRI_TONE[t.priority]}>{t.priority}</Badge></td>
                  <td className="px-4 py-2 text-gray-300">{t.team}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{t.sentiment}</td>
                  <td className="px-4 py-2"><Badge tone={t.status === "Open" ? "amber" : t.status === "Resolved by bot" ? "emerald" : "cyan"}>{t.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
