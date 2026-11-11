import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Cpu, LayoutDashboard, FlaskConical, Github } from "lucide-react";
import clsx from "clsx";
import { PROJECTS } from "../data/projects";
import { REPO } from "../lib/links";

const TOP = [
  { to: "/", label: "Command Center", icon: LayoutDashboard },
  { to: "/labs", label: "Lab Library", icon: FlaskConical },
];

function Item({ to, label, Icon, compact }: { to: string; label: string; Icon: typeof Cpu; compact?: boolean }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        clsx(
          "flex items-center rounded-md transition-colors",
          compact ? "shrink-0 gap-1.5 px-2.5 py-1.5 text-xs" : "gap-3 px-3 py-2 text-sm",
          isActive ? "bg-violet/15 text-violet-light" : "text-gray-400 hover:text-gray-100 hover:bg-white/5",
        )
      }
    >
      <Icon size={compact ? 14 : 16} />
      {label}
    </NavLink>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const current = [...TOP, ...PROJECTS.map((p) => ({ to: p.route, label: p.short }))].find((n) => n.to === pathname);
  return (
    <div className="flex h-full backdrop">
      <aside className="hidden md:flex w-60 shrink-0 border-r border-glass bg-surface/70 backdrop-blur flex-col">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-glass">
          <div className="grid place-items-center h-7 w-7 rounded-md bg-violet/15 ring-1 ring-violet/30">
            <Cpu className="text-violet-light" size={16} />
          </div>
          <span className="font-semibold tracking-tight">
            Capstone<span className="text-violet-light">OS</span>
          </span>
          <span className="ml-auto font-mono text-[10px] text-gray-500">v1.0</span>
        </div>
        <nav className="flex-1 overflow-auto p-2 space-y-1">
          {TOP.map((n) => (
            <Item key={n.to} to={n.to} label={n.label} Icon={n.icon} />
          ))}
          <div className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-[0.14em] text-gray-500">Capstone demos</div>
          {PROJECTS.map((p) => (
            <Item key={p.route} to={p.route} label={p.short} Icon={p.icon} />
          ))}
        </nav>
        <div className="p-3 border-t border-glass space-y-2">
          <a href={REPO} target="_blank" rel="noreferrer"
             className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-white/5">
            <Github size={16} /> Source on GitHub
          </a>
          <p className="px-3 text-[11px] leading-relaxed text-gray-500">
            Every demo runs client-side. Production code for AWS lives in the repo.
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 md:px-6 border-b border-glass bg-surface/50 backdrop-blur">
          <span className="md:hidden font-semibold tracking-tight">
            Capstone<span className="text-violet-light">OS</span>
          </span>
          <span className="hidden md:inline font-mono text-xs text-gray-500">
            ~/portfolio/<span className="text-gray-200">{current?.label ?? "demo"}</span>
          </span>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-glass px-3 py-1 text-xs text-gray-400">
              <span className="h-2 w-2 rounded-full bg-emerald animate-pulse" />
              live demo · runs in your browser
            </div>
            <a href={REPO} target="_blank" rel="noreferrer"
               className="flex items-center gap-1.5 rounded-md bg-violet/20 px-3 py-1.5 text-xs font-medium text-violet-light ring-1 ring-violet/30 hover:bg-violet/30">
              <Github size={14} /> View code
            </a>
          </div>
        </header>
        <nav className="md:hidden flex gap-1 overflow-x-auto border-b border-glass px-3 py-2">
          {TOP.map((n) => (
            <Item key={n.to} to={n.to} label={n.label} Icon={n.icon} compact />
          ))}
          {PROJECTS.map((p) => (
            <Item key={p.route} to={p.route} label={p.short} Icon={p.icon} compact />
          ))}
        </nav>
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
