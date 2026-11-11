import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Code2, Github, MousePointerClick, Search, Terminal, X } from "lucide-react";
import clsx from "clsx";
import { LABS, labFolder, projectsForLab, type Lab } from "../data/labs";
import { TRACKS, trackOf, type TrackKey } from "../data/tracks";
import { Badge, Input, PageHeader, Pills } from "../components/ui";
import { treeUrl } from "../lib/links";

const MODE_ICON = { Console: MousePointerClick, API: Terminal, Code: Code2 } as const;

export function LabLibrary() {
  const [q, setQ] = useState("");
  const [track, setTrack] = useState<TrackKey | "all">("all");
  const [sel, setSel] = useState<Lab | null>(null);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return LABS.filter((l) => (track === "all" || l.track === track) &&
      (!s || `${l.title} ${l.summary} ${l.services.join(" ")}`.toLowerCase().includes(s)));
  }, [q, track]);

  return (
    <>
      <PageHeader eyebrow="Lab library" title={`${LABS.length} hands-on AWS labs`}
        subtitle="Every lab completed on the path to the capstones. Filter by track, search by service, and open any lab for its objectives and reference code." />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input value={q} onChange={setQ} placeholder="Search labs or services..." className="w-64 pl-8" />
        </div>
        <Pills value={track} onChange={setTrack}
          options={[{ key: "all" as const, label: "All" }, ...TRACKS.map((t) => ({ key: t.key, label: t.label }))]} />
        <span className="ml-auto font-mono text-xs text-gray-500">{list.length} shown</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-2 sm:grid-cols-2">
          {list.map((l) => {
            const t = trackOf(l.track);
            const Icon = MODE_ICON[l.mode];
            return (
              <button key={l.n} onClick={() => setSel(l)}
                className={clsx("animate-rise rounded-xl border bg-surface/70 p-3.5 text-left transition-colors hover:border-white/20",
                  sel?.n === l.n ? "border-violet/50" : "border-glass")}>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="font-mono text-gray-500">LAB {String(l.n).padStart(2, "0")}</span>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
                  <span className="text-gray-500">{t.label}</span>
                  <span className="ml-auto flex items-center gap-1 text-gray-500"><Icon size={12} />{l.mode}</span>
                </div>
                <div className="mt-1.5 text-sm font-medium leading-snug">{l.title}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {l.services.slice(0, 3).map((s) => <Badge key={s}>{s}</Badge>)}
                  {l.code && <Badge tone="emerald">code</Badge>}
                </div>
              </button>
            );
          })}
          {list.length === 0 && <div className="text-sm text-gray-500">No labs match that search.</div>}
        </div>

        <aside className="lg:sticky lg:top-0 h-fit rounded-xl border border-glass bg-surface/80 p-4">
          {!sel ? (
            <div className="py-10 text-center text-sm text-gray-500">Select a lab to see its objectives, services and code.</div>
          ) : (
            <div className="animate-rise space-y-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-violet-light">LAB {String(sel.n).padStart(2, "0")} · {sel.mode}</div>
                  <h2 className="mt-1 text-base font-semibold leading-snug">{sel.title}</h2>
                </div>
                <button onClick={() => setSel(null)} className="ml-auto rounded p-1 text-gray-500 hover:bg-white/5"><X size={15} /></button>
              </div>
              <p className="text-sm leading-relaxed text-gray-300">{sel.summary}</p>
              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-wide text-gray-500">What I did</div>
                <ul className="space-y-1.5 text-sm text-gray-300">
                  {sel.outcomes.map((o) => <li key={o} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-light" />{o}</li>)}
                </ul>
              </div>
              <div className="flex flex-wrap gap-1">{sel.services.map((s) => <Badge key={s} tone="violet">{s}</Badge>)}</div>
              {projectsForLab(sel.n).length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] uppercase tracking-wide text-gray-500">Used in capstone</div>
                  <div className="space-y-1">
                    {projectsForLab(sel.n).map((p) => (
                      <Link key={p.key} to={p.route} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-200 hover:bg-white/5">
                        <p.icon size={14} style={{ color: p.color }} /> {p.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <a href={treeUrl(labFolder(sel))} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-md border border-glass px-3 py-2 text-sm text-gray-200 hover:bg-white/5">
                <Github size={15} /> Open lab on GitHub
              </a>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
