import type { ReactNode } from "react";
import clsx from "clsx";
import { Github, Info } from "lucide-react";
import { treeUrl } from "../lib/links";

export function PageHeader({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-violet-light">{eyebrow}</div>}
        <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-gray-400">{subtitle}</p>}
      </div>
      {right && <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

export function Card({ children, className, title, right, pad = true }: { children: ReactNode; className?: string; title?: ReactNode; right?: ReactNode; pad?: boolean }) {
  return (
    <section className={clsx("min-w-0 rounded-xl border border-glass bg-surface/70 backdrop-blur-sm", className)}>
      {title && (
        <header className="flex items-center gap-2 border-b border-glass px-4 py-2.5">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">{title}</h2>
          {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
        </header>
      )}
      <div className={clsx(pad && "p-4")}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, tone, hint }: { label: string; value: ReactNode; tone?: "pos" | "neg" | "violet" | "amber" | "cyan"; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border border-glass bg-surface/70 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={clsx("mt-0.5 font-mono text-xl",
        tone === "pos" && "text-emerald-light", tone === "neg" && "text-crimson-light",
        tone === "violet" && "text-violet-light", tone === "amber" && "text-amber-light", tone === "cyan" && "text-cyan-light")}>{value}</div>
      {hint && <div className="text-[11px] text-gray-500">{hint}</div>}
    </div>
  );
}

export function Pills<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap overflow-hidden rounded-md border border-glass">
      {options.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={clsx("px-2.5 py-1 text-xs transition-colors",
            value === o.key ? "bg-violet/20 text-violet-light" : "text-gray-400 hover:bg-white/5")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type Tone = "violet" | "emerald" | "crimson" | "amber" | "cyan" | "gray";
const TONES: Record<Tone, string> = {
  violet: "bg-violet/15 text-violet-light ring-violet/30",
  emerald: "bg-emerald/15 text-emerald-light ring-emerald/30",
  crimson: "bg-crimson/15 text-crimson-light ring-crimson/30",
  amber: "bg-amber/15 text-amber-light ring-amber/30",
  cyan: "bg-cyan/15 text-cyan-light ring-cyan/30",
  gray: "bg-white/5 text-gray-300 ring-white/10",
};
export function Badge({ children, tone = "gray", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ring-1", TONES[tone], className)}>{children}</span>;
}

export function Button({ children, onClick, variant = "primary", disabled, className }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost"; disabled?: boolean; className?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={clsx("inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" ? "bg-violet text-white hover:bg-violet-indigo" : "border border-glass text-gray-300 hover:bg-white/5", className)}>
      {children}
    </button>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className="font-mono text-gray-200">{format ? format(value) : value}</span>
      </div>
      <input type="range" className="mt-1 w-full" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5">
      <span className={clsx("relative h-4 w-7 shrink-0 rounded-full transition-colors", checked ? "bg-violet" : "bg-white/15")}>
        <span className={clsx("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all", checked ? "left-3.5" : "left-0.5")} />
      </span>
      <span className="min-w-0">
        <span className="text-gray-200">{label}</span>
        {hint && <span className="block text-[11px] text-gray-500">{hint}</span>}
      </span>
    </button>
  );
}

export function TextArea({ value, onChange, rows = 5, className, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; className?: string; placeholder?: string }) {
  return (
    <textarea value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className={clsx("w-full resize-y rounded-md border border-glass bg-obsidian/60 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:border-violet/50 focus:outline-none", className)} />
  );
}

export function Input({ value, onChange, className, type = "text", placeholder, onEnter }: { value: string | number; onChange: (v: string) => void; className?: string; type?: string; placeholder?: string; onEnter?: () => void }) {
  return (
    <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
      className={clsx("rounded-md border border-glass bg-obsidian/60 px-2.5 py-1.5 text-sm text-gray-100 placeholder:text-gray-600 focus:border-violet/50 focus:outline-none", className)} />
  );
}

export function Meter({ value, max = 1, color = "#8B5CF6", className }: { value: number; max?: number; color?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-white/5", className)}>
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function DemoNotice({ children, stack, folder }: { children: ReactNode; stack: string[]; folder: string }) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-violet/20 bg-violet/[0.06] px-4 py-3 text-sm">
      <Info size={16} className="mt-0.5 shrink-0 text-violet-light" />
      <div className="min-w-0 flex-1 text-gray-300">
        {children}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-[11px] text-gray-500">Production stack:</span>
          {stack.map((s) => <Badge key={s}>{s}</Badge>)}
        </div>
      </div>
      <a href={treeUrl(folder)} target="_blank" rel="noreferrer"
         className="flex items-center gap-1.5 rounded-md border border-glass px-2.5 py-1 text-xs text-gray-300 hover:bg-white/5">
        <Github size={13} /> AWS implementation
      </a>
    </div>
  );
}

export function LineChart({ series, height = 140, max }: { series: { values: number[]; color: string; label: string }[]; height?: number; max?: number }) {
  const W = 600;
  const n = Math.max(2, ...series.map((s) => s.values.length));
  const top = max ?? Math.max(1, ...series.flatMap((s) => s.values)) * 1.1;
  const pts = (v: number[]) => v.map((y, i) => `${(i / (n - 1)) * W},${height - (y / top) * height}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={W} y1={height * f} y2={height * f} stroke="rgba(255,255,255,0.06)" />)}
        {series.map((s) => s.values.length > 1 && (
          <g key={s.label}>
            <polygon points={`0,${height} ${pts(s.values)} ${((s.values.length - 1) / (n - 1)) * W},${height}`} fill={s.color} opacity={0.08} />
            <polyline points={pts(s.values)} fill="none" stroke={s.color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-400">
        {series.map((s) => <span key={s.label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>)}
      </div>
    </div>
  );
}

export function Code({ children }: { children: string }) {
  return <pre className="max-h-72 overflow-auto rounded-md border border-glass bg-obsidian/80 p-3 font-mono text-[11.5px] leading-relaxed text-gray-300">{children}</pre>;
}
