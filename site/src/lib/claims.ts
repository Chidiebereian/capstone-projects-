export type ClaimType = "auto" | "home" | "health";
export type Claim = {
  claimant: string; policy: string; type: ClaimType; amount: number;
  incidentDate: string; reportedDate: string; description: string; priorClaims: number;
};
export type Policy = { holder: string; type: ClaimType; status: "active" | "lapsed"; limit: number; deductible: number; start: string };

export const POLICIES: Record<string, Policy> = {
  "POL-1001": { holder: "Ada Okafor", type: "auto", status: "active", limit: 25000, deductible: 500, start: "2023-02-01" },
  "POL-2002": { holder: "Marcus Lee", type: "home", status: "active", limit: 60000, deductible: 1000, start: "2026-10-20" },
  "POL-3003": { holder: "Priya Shah", type: "health", status: "lapsed", limit: 15000, deductible: 250, start: "2024-05-12" },
  "POL-4004": { holder: "Tunde Bello", type: "home", status: "active", limit: 80000, deductible: 1500, start: "2021-07-30" },
};

export const SCENARIOS: { label: string; claim: Claim }[] = [
  { label: "Clean auto claim", claim: { claimant: "Ada Okafor", policy: "POL-1001", type: "auto", amount: 3200, incidentDate: "2026-11-02", reportedDate: "2026-11-03",
    description: "Rear-ended at a traffic light. Police report #4471 attached with photos and a repair estimate from a certified body shop.", priorClaims: 0 } },
  { label: "Suspicious water damage", claim: { claimant: "Marcus Lee", policy: "POL-2002", type: "home", amount: 48500, incidentDate: "2026-11-01", reportedDate: "2026-11-10",
    description: "Pipe burst while I was away. Total loss of electronics and jewelry. No receipts available, would prefer a cash settlement urgently.", priorClaims: 3 } },
  { label: "Lapsed health policy", claim: { claimant: "Priya Shah", policy: "POL-3003", type: "health", amount: 2100, incidentDate: "2026-10-28", reportedDate: "2026-10-30",
    description: "Emergency room visit for a sprained ankle. Itemized hospital invoice and discharge summary attached.", priorClaims: 1 } },
  { label: "Large but legitimate", claim: { claimant: "Tunde Bello", policy: "POL-4004", type: "home", amount: 92000, incidentDate: "2026-11-05", reportedDate: "2026-11-05",
    description: "Kitchen fire. Fire department report, photos and contractor estimate attached.", priorClaims: 0 } },
];

export type AgentKey = "supervisor" | "intake" | "policy" | "fraud" | "adjudication";
export const AGENTS: { key: AgentKey; label: string; role: string }[] = [
  { key: "supervisor", label: "Supervisor", role: "plans & routes" },
  { key: "intake", label: "Intake", role: "validates & extracts" },
  { key: "policy", label: "Policy", role: "coverage lookup" },
  { key: "fraud", label: "Fraud", role: "risk scoring" },
  { key: "adjudication", label: "Adjudication", role: "decision & payout" },
];

export type TraceEvent = { agent: AgentKey; kind: "think" | "tool" | "result" | "handoff" | "decision"; text: string };
export type Decision = { outcome: "APPROVED" | "HUMAN_REVIEW" | "DENIED"; payout: number; fraud: number; signals: { label: string; pts: number }[]; reason: string };

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export function fraudSignals(c: Claim, p?: Policy) {
  const s: { label: string; pts: number }[] = [];
  const d = c.description.toLowerCase();
  if (p && c.amount / p.limit > 0.7) s.push({ label: `Amount is ${Math.round((c.amount / p.limit) * 100)}% of coverage limit`, pts: 25 });
  if (p && days(p.start, c.incidentDate) < 30) s.push({ label: `Incident ${days(p.start, c.incidentDate)} days after policy start`, pts: 25 });
  const delay = days(c.incidentDate, c.reportedDate);
  if (delay > 7) s.push({ label: `Reported ${delay} days after incident`, pts: 15 });
  if (c.priorClaims >= 2) s.push({ label: `${c.priorClaims} prior claims`, pts: 15 });
  const red = ["cash", "no receipt", "urgent", "total loss"].filter((k) => d.includes(k));
  if (red.length) s.push({ label: `Red-flag phrases: ${red.join(", ")}`, pts: Math.min(20, red.length * 7) });
  const ev = ["police report", "photos", "estimate", "invoice", "fire department", "discharge"].filter((k) => d.includes(k));
  if (ev.length && !d.includes("no receipt")) s.push({ label: `Supporting evidence: ${ev.join(", ")}`, pts: -10 });
  return s;
}

export function runClaim(c: Claim): { trace: TraceEvent[]; decision: Decision } {
  const t: TraceEvent[] = [];
  const p = POLICIES[c.policy];
  t.push({ agent: "supervisor", kind: "think", text: `New ${c.type} claim from ${c.claimant} for ${usd(c.amount)}. Plan: intake -> policy -> fraud -> adjudication.` });
  t.push({ agent: "supervisor", kind: "handoff", text: "Delegating to Intake agent" });
  const missing = (["claimant", "policy", "description"] as const).filter((k) => !String(c[k]).trim());
  t.push({ agent: "intake", kind: "tool", text: `validate_claim(fields=8) -> ${missing.length ? "missing: " + missing.join(", ") : "all required fields present"}` });
  t.push({ agent: "intake", kind: "result", text: `Extracted: incident ${c.incidentDate}, reported ${c.reportedDate}, ${c.priorClaims} prior claims` });
  t.push({ agent: "supervisor", kind: "handoff", text: "Delegating to Policy agent" });
  t.push({ agent: "policy", kind: "tool", text: `lookup_policy(policy_id="${c.policy}")` });
  const sig = fraudSignals(c, p);
  const fraud = Math.max(0, Math.min(100, sig.reduce((a, s) => a + s.pts, 0)));
  if (!p) {
    t.push({ agent: "policy", kind: "result", text: "Policy not found in DynamoDB table policies" });
    t.push({ agent: "adjudication", kind: "decision", text: "DENIED: no matching policy" });
    return { trace: t, decision: { outcome: "DENIED", payout: 0, fraud, signals: sig, reason: "No matching policy on record." } };
  }
  t.push({ agent: "policy", kind: "result", text: `${p.holder} · ${p.type} · ${p.status} · limit ${usd(p.limit)} · deductible ${usd(p.deductible)}` });
  const problems: string[] = [];
  if (p.status !== "active") problems.push("policy is lapsed");
  if (p.type !== c.type) problems.push(`claim type ${c.type} not covered by ${p.type} policy`);
  if (p.holder.toLowerCase() !== c.claimant.trim().toLowerCase()) problems.push("claimant is not the policy holder");
  if (days(p.start, c.incidentDate) < 0) problems.push("incident predates coverage");
  t.push({ agent: "policy", kind: "think", text: problems.length ? `Coverage issues: ${problems.join("; ")}` : "Coverage confirmed for this incident." });
  t.push({ agent: "supervisor", kind: "handoff", text: "Delegating to Fraud agent" });
  t.push({ agent: "fraud", kind: "tool", text: `score_fraud_risk(claim, policy) -> ${sig.length} signals` });
  sig.forEach((s) => t.push({ agent: "fraud", kind: "result", text: `${s.pts > 0 ? "+" : ""}${s.pts}  ${s.label}` }));
  t.push({ agent: "fraud", kind: "think", text: `Fraud risk score ${fraud}/100 (${fraud >= 50 ? "HIGH" : fraud >= 25 ? "MEDIUM" : "LOW"})` });
  t.push({ agent: "supervisor", kind: "handoff", text: "Delegating to Adjudication agent" });
  const payout = Math.max(0, Math.min(c.amount, p.limit) - p.deductible);
  t.push({ agent: "adjudication", kind: "tool", text: `calculate_payout(amount=${c.amount}, limit=${p.limit}, deductible=${p.deductible}) -> ${usd(payout)}` });
  let d: Decision;
  if (problems.length) d = { outcome: "DENIED", payout: 0, fraud, signals: sig, reason: problems.join("; ") };
  else if (fraud >= 50) d = { outcome: "HUMAN_REVIEW", payout, fraud, signals: sig, reason: "Fraud risk above auto-approval threshold (50). Routed to a claims adjuster with the signal breakdown." };
  else d = { outcome: "APPROVED", payout, fraud, signals: sig, reason: c.amount > p.limit ? `Approved up to the coverage limit; ${usd(c.amount - p.limit)} exceeds the limit.` : "Covered, low risk, evidence provided. Straight-through processed." };
  t.push({ agent: "adjudication", kind: "decision", text: `${d.outcome}${d.outcome !== "DENIED" ? ` · payout ${usd(d.payout)}` : ""}` });
  t.push({ agent: "supervisor", kind: "think", text: "Writing decision to claims table and notifying claimant via SNS." });
  return { trace: t, decision: d };
}
