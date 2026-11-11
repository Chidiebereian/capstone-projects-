import raw from "./labs.json";
import type { TrackKey } from "./tracks";
import { PROJECTS } from "./projects";

export type Lab = {
  n: number; slug: string; title: string; track: TrackKey; mode: "Console" | "API" | "Code";
  services: string[]; summary: string; outcomes: string[]; code: boolean;
};
export const LABS = raw as Lab[];
export const labFolder = (l: Lab) => `labs/${l.slug}`;
export const projectsForLab = (n: number) => PROJECTS.filter((p) => p.labs.includes(n));
export const ALL_SERVICES = Array.from(new Set(LABS.flatMap((l) => l.services))).sort();
