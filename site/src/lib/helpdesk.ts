export type Slot = { name: string; prompt: string; options?: string[] };
export type Intent = { name: string; keywords: string[]; slots: Slot[]; team: string; base: number; resolve?: (s: Record<string, string>) => string };

export const INTENTS: Intent[] = [
  { name: "ResetPassword", keywords: ["password", "locked", "lockout", "login", "log in", "sign in", "reset", "mfa"], team: "Identity", base: 3,
    slots: [{ name: "system", prompt: "Which system are you locked out of?", options: ["Okta SSO", "Email", "VPN", "Laptop"] }],
    resolve: (s) => `I've sent a secure reset link for ${s.system} to your registered phone. It expires in 15 minutes.` },
  { name: "VpnIssue", keywords: ["vpn", "remote access", "connect", "tunnel", "disconnect"], team: "Network", base: 2,
    slots: [{ name: "location", prompt: "Are you at home, travelling, or in the office?", options: ["Home", "Travelling", "Office"] },
            { name: "os", prompt: "Which operating system are you on?", options: ["Windows", "macOS", "Linux"] }] },
  { name: "HardwareFailure", keywords: ["laptop", "screen", "keyboard", "battery", "broken", "cracked", "monitor", "mouse", "won't turn on", "overheating"], team: "Field Services", base: 2,
    slots: [{ name: "device", prompt: "Which device is affected?", options: ["Laptop", "Monitor", "Keyboard", "Phone"] },
            { name: "urgency", prompt: "How urgent is this?", options: ["Low", "Medium", "High"] }] },
  { name: "SoftwareRequest", keywords: ["install", "license", "software", "access to", "need access", "permission", "subscription"], team: "IT Ops", base: 4,
    slots: [{ name: "software", prompt: "Which software or system do you need?" }, { name: "reason", prompt: "What do you need it for? (one sentence for your manager)" }] },
  { name: "TicketStatus", keywords: ["status", "my ticket", "update on", "inc-"], team: "", base: 4, slots: [] },
  { name: "Greeting", keywords: ["hi", "hello", "hey", "good morning"], team: "", base: 4, slots: [] },
];

const NEG = ["frustrated", "angry", "annoyed", "again", "still", "terrible", "worst", "asap", "urgent", "useless", "ridiculous", "can't", "cannot", "deadline", "nothing works", "hate", "broken"];
const POS = ["thanks", "thank", "great", "appreciate", "awesome", "perfect", "love", "helpful"];

export type Sentiment = { sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED"; scores: Record<"Positive" | "Negative" | "Neutral" | "Mixed", number> };
export function detectSentiment(text: string): Sentiment {
  const t = text.toLowerCase();
  const n = NEG.filter((w) => t.includes(w)).length + (text.match(/!/g)?.length ?? 0) * 0.5;
  const p = POS.filter((w) => t.includes(w)).length;
  const raw = { Positive: 0.1 + p, Negative: 0.1 + n, Neutral: 1, Mixed: p && n ? Math.min(p, n) : 0.02 };
  const z = raw.Positive + raw.Negative + raw.Neutral + raw.Mixed;
  const scores = { Positive: raw.Positive / z, Negative: raw.Negative / z, Neutral: raw.Neutral / z, Mixed: raw.Mixed / z };
  const top = (Object.entries(scores) as [keyof typeof scores, number][]).sort((a, b) => b[1] - a[1])[0][0];
  return { sentiment: top.toUpperCase() as Sentiment["sentiment"], scores };
}

export function classify(text: string) {
  const t = ` ${text.toLowerCase()} `;
  const scored = INTENTS.map((i) => ({ name: i.name, hits: i.keywords.filter((k) => (k.length <= 3 ? new RegExp(`\\b${k}\\b`).test(t) : t.includes(k))).length }));
  const total = scored.reduce((a, s) => a + s.hits, 0);
  const ranked = scored.map((s) => ({ name: s.name, score: total ? (s.hits / total) * Math.min(1, 0.55 + s.hits * 0.2) : 0 }))
    .sort((a, b) => b.score - a.score);
  return ranked[0].score >= 0.3 ? { top: ranked[0].name, ranked: ranked.slice(0, 3) } : { top: "FallbackIntent", ranked: [{ name: "FallbackIntent", score: 1 }, ...ranked.slice(0, 2)] };
}

export const PRIORITY = ["P1", "P2", "P3", "P4"] as const;
export function priorityFor(intent: Intent, slots: Record<string, string>, s: Sentiment) {
  let p = intent.base;
  if (slots.urgency === "High") p = 1;
  else if (slots.urgency === "Medium") p = Math.min(p, 2);
  if (s.sentiment === "NEGATIVE") p = Math.max(1, p - 1);
  return PRIORITY[p - 1];
}
