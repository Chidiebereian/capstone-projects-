import { Link } from "react-router-dom";
import { ArrowUpRight, Boxes, FlaskConical, Layers, Sparkles, Terminal } from "lucide-react";
import { PROJECTS } from "../data/projects";
import { LABS, ALL_SERVICES } from "../data/labs";
import { TRACKS } from "../data/tracks";
import { Badge, Card, Meter, Stat } from "../components/ui";
import { REPO } from "../lib/links";

export function Overview() {
  const byTrack = TRACKS.map((t) => ({ ...t, count: LABS.filter((l) => l.track === t.key).length }));
  const maxTrack = Math.max(...byTrack.map((t) => t.count));
  const codeLabs = LABS.filter((l) => l.code).length;
  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-glass bg-surface/70 p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-40 h-60 w-60 rounded-full bg-cyan/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet"><Sparkles size={11} /> AWS Generative AI</Badge>
            <Badge tone="cyan">Data Engineering</Badge>
            <Badge tone="emerald">Agentic AI</Badge>
          </div>
          <h1 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight tracking-tight md:text-4xl">
            Production-style AI systems on AWS, <span className="text-violet-light">running live in your browser.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400 md:text-base">
            {LABS.length} hands-on labs distilled into {PROJECTS.length} capstone projects: retrieval-augmented generation,
            multi-agent orchestration, guardrails, streaming analytics and GenAI cost engineering. Every demo below is
            interactive; the AWS implementation for each one is in the repository.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/rag" className="inline-flex items-center gap-1.5 rounded-md bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet-indigo">
              Try the RAG assistant <ArrowUpRight size={15} />
            </Link>
            <Link to="/labs" className="inline-flex items-center gap-1.5 rounded-md border border-glass px-4 py-2 text-sm text-gray-200 hover:bg-white/5">
              Browse all {LABS.length} labs
            </Link>
            <a href={REPO} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-glass px-4 py-2 text-sm text-gray-200 hover:bg-white/5">
              <Terminal size={15} /> Read the code
            </a>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Hands-on labs" value={LABS.length} tone="violet" hint={`${codeLabs} with reference code`} />
        <Stat label="Capstone demos" value={PROJECTS.length} tone="pos" hint="all interactive" />
        <Stat label="AWS services used" value={ALL_SERVICES.length} tone="cyan" hint="across 7 tracks" />
        <Stat label="Backend required" value="0" tone="amber" hint="demos run client-side" />
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Boxes size={16} className="text-violet-light" />
          <h2 className="text-sm font-medium">Capstone projects</h2>
          <span className="text-xs text-gray-500">click any card to open the live demo</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PROJECTS.map((p, i) => (
            <Link key={p.key} to={p.route}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-glass bg-surface/70 p-4 transition-all hover:-translate-y-0.5 hover:border-white/20">
              <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${p.color}, transparent)` }} />
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${p.color}1f`, color: p.color }}>
                  <p.icon size={16} />
                </div>
                <span className="font-mono text-[10px] text-gray-500">0{i + 1}</span>
                <ArrowUpRight size={15} className="ml-auto text-gray-600 transition-colors group-hover:text-gray-200" />
              </div>
              <h3 className="mt-3 text-sm font-semibold leading-snug">{p.title}</h3>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-gray-400">{p.pitch}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.services.slice(0, 3).map((s) => <Badge key={s}>{s}</Badge>)}
                {p.services.length > 3 && <Badge>+{p.services.length - 3}</Badge>}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Skill tracks" className="lg:col-span-2" right={<Layers size={14} className="text-gray-500" />}>
          <div className="space-y-3">
            {byTrack.map((t) => (
              <div key={t.key}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-gray-300">{t.label}</span>
                  <span className="font-mono text-gray-500">{t.count} labs</span>
                </div>
                <Meter value={t.count} max={maxTrack} color={t.color} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="AWS service coverage" className="lg:col-span-3" right={<FlaskConical size={14} className="text-gray-500" />}>
          <div className="flex flex-wrap gap-1.5">
            {ALL_SERVICES.map((s) => {
              const n = LABS.filter((l) => l.services.includes(s)).length;
              return (
                <span key={s} className="rounded-md border border-glass px-2 py-1 text-[11px] text-gray-300"
                  style={{ background: `rgba(139,92,246,${Math.min(0.08 + n * 0.05, 0.4)})` }}>
                  {s}<span className="ml-1.5 font-mono text-gray-500">{n}</span>
                </span>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
