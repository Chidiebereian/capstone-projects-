export type EntityType = "MEDICAL_CONDITION" | "MEDICATION" | "DOSAGE" | "TEST_TREATMENT_PROCEDURE" | "ANATOMY" | "PHI";
export type Entity = { start: number; end: number; text: string; type: EntityType; sub?: string };

const DICT: Record<Exclude<EntityType, "DOSAGE" | "PHI">, string[]> = {
  MEDICAL_CONDITION: ["community-acquired pneumonia", "pneumonia", "shortness of breath", "chest tightness", "chest pain", "cough", "fever", "type 2 diabetes", "diabetes", "neuropathy", "numbness", "fatigue", "headache", "hypertension", "tingling"],
  MEDICATION: ["lisinopril", "amoxicillin", "metformin", "ibuprofen", "atorvastatin", "insulin glargine", "insulin", "acetaminophen"],
  TEST_TREATMENT_PROCEDURE: ["chest x-ray", "cbc", "hemoglobin a1c", "a1c", "lipid panel", "foot exam", "ecg", "blood test", "monofilament test"],
  ANATOMY: ["right lower lung", "lung", "chest", "feet", "foot", "toes", "heart"],
};
const PHI_RE: { re: RegExp; sub: string }[] = [
  { re: /\b(?:Mr|Ms|Mrs|Dr)\.? [A-Z][a-z]+(?: [A-Z][a-z]+)?/g, sub: "NAME" },
  { re: /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/g, sub: "PHONE" },
  { re: /\bMRN[: ]*\d+\b/g, sub: "ID" },
  { re: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(?:, \d{4})?\b/g, sub: "DATE" },
  { re: /\b\d{1,3}-year-old\b/g, sub: "AGE" },
];

export function extract(text: string): Entity[] {
  const out: Entity[] = [];
  const lower = text.toLowerCase();
  for (const [type, words] of Object.entries(DICT) as [EntityType, string[]][])
    for (const w of words) {
      let i = lower.indexOf(w);
      while (i >= 0) {
        const before = i === 0 ? " " : lower[i - 1];
        const after = lower[i + w.length] ?? " ";
        if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) out.push({ start: i, end: i + w.length, text: text.slice(i, i + w.length), type });
        i = lower.indexOf(w, i + 1);
      }
    }
  for (const m of text.matchAll(/\b\d+(?:\.\d+)? ?mg\b/g)) out.push({ start: m.index!, end: m.index! + m[0].length, text: m[0], type: "DOSAGE" });
  for (const p of PHI_RE) for (const m of text.matchAll(p.re)) out.push({ start: m.index!, end: m.index! + m[0].length, text: m[0], type: "PHI", sub: p.sub });
  out.sort((a, b) => a.start - b.start || b.end - a.end);
  const clean: Entity[] = [];
  for (const e of out) if (!clean.length || e.start >= clean[clean.length - 1].end) clean.push(e);
  return clean;
}

export const redact = (text: string) => {
  const ents = extract(text).filter((e) => e.type === "PHI");
  let out = text;
  for (const e of [...ents].reverse()) out = out.slice(0, e.start) + `[${e.sub}]` + out.slice(e.end);
  return out;
};

export type Turn = { speaker: "DOCTOR" | "PATIENT"; text: string };
export const parse = (t: string): Turn[] =>
  t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(DOCTOR|PATIENT|DR|PT)\s*:\s*(.*)$/i);
    return m ? { speaker: (/^(doctor|dr)$/i.test(m[1]) ? "DOCTOR" : "PATIENT") as Turn["speaker"], text: m[2] } : { speaker: "PATIENT" as const, text: l };
  });

const sentences = (s: string) => s.match(/[^.!?]+[.!?]?/g)?.map((x) => x.trim()).filter(Boolean) ?? [];
const uniq = (a: string[]) => Array.from(new Set(a));

export function soap(turns: Turn[]) {
  const pat = turns.filter((t) => t.speaker === "PATIENT").map((t) => t.text).join(" ");
  const doc = turns.filter((t) => t.speaker === "DOCTOR").map((t) => t.text).join(" ");
  const ents = (s: string, type: EntityType) => uniq(extract(s).filter((e) => e.type === type).map((e) => e.text.toLowerCase()));
  const vitals: string[] = [];
  const temp = doc.match(/(\d{2}(?:\.\d)?) ?(?:degrees )?(C|F)\b/); if (temp) vitals.push(`Temp ${temp[1]} ${temp[2]}`);
  const bp = doc.match(/\b(\d{2,3}\/\d{2,3})\b/); if (bp) vitals.push(`BP ${bp[1]}`);
  const hr = doc.match(/heart rate (?:of )?(\d{2,3})/i); if (hr) vitals.push(`HR ${hr[1]}`);
  const spo2 = doc.match(/saturation (?:of )?(\d{2,3}) ?(?:percent|%)/i); if (spo2) vitals.push(`SpO2 ${spo2[1]}%`);
  const exam = sentences(doc).filter((s) => /\b(hear|exam|noted|observe|reduced|decreased|crackles)\b/i.test(s) && !/\b(temperature|pressure)\b/i.test(s));
  const dx = sentences(doc).filter((s) => /\b(suspect|diagnos|consistent with|likely|looks like)\b/i.test(s));
  const assessment = uniq(dx.flatMap((s) => ents(s, "MEDICAL_CONDITION")));
  const meds = sentences(doc).filter((s) => /\b(prescrib|start|continue|increase|take)\w*/i.test(s) && ents(s, "MEDICATION").length);
  const tests = ents(doc, "TEST_TREATMENT_PROCEDURE");
  const follow = sentences(doc).filter((s) => /follow[- ]up|come back|return|rest at home/i.test(s));
  const current = sentences(pat).filter((s) => ents(s, "MEDICATION").length);
  return {
    S: { complaint: ents(pat, "MEDICAL_CONDITION"), hpi: sentences(pat).filter((s) => ents(s, "MEDICAL_CONDITION").length), meds: current },
    O: { vitals, exam },
    A: assessment.length ? assessment : ents(doc, "MEDICAL_CONDITION"),
    P: { meds, tests, follow },
  };
}

export const TRANSCRIPTS = [
  { label: "Respiratory visit", text: `DOCTOR: Good morning Mr. Daniel Reyes, I'm Dr. Amara Nwosu. What brings you in today?
PATIENT: I've had a persistent cough and shortness of breath for about two weeks, and a fever since Sunday.
DOCTOR: Any chest pain?
PATIENT: Some chest tightness when I climb stairs. I'm still taking lisinopril 10 mg for my blood pressure.
DOCTOR: Your temperature is 38.1 C, blood pressure 138/86, heart rate 96 and oxygen saturation 94 percent. I hear crackles in the right lower lung.
DOCTOR: I suspect community-acquired pneumonia. Let's get a chest x-ray and a CBC today. I'm prescribing amoxicillin 500 mg three times daily for seven days.
PATIENT: Okay. Can I still go to work?
DOCTOR: Rest at home for three days and drink fluids. Follow up in one week, or call 555-201-3344 sooner if your breathing gets worse.` },
  { label: "Diabetes follow-up", text: `DOCTOR: Hi Ms. Grace Bello, MRN 4482913. How have things been since March 3?
PATIENT: Mostly fine, but I get numbness and tingling in my feet at night, and some fatigue.
PATIENT: I take metformin 1000 mg twice a day like you said.
DOCTOR: Blood pressure today is 128/78 and heart rate 72. On the foot exam I noted reduced sensation in both feet with the monofilament test.
DOCTOR: This looks like early diabetic neuropathy related to your type 2 diabetes. Your last hemoglobin A1c was 8.2.
DOCTOR: Let's continue metformin 1000 mg and start atorvastatin 20 mg nightly. I'll order a lipid panel and repeat the A1c.
DOCTOR: Please come back in three months for follow-up.` },
];
