"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, Captions, ChartNoAxesCombined, ChevronDown, Clapperboard,
  FolderKanban, LayoutDashboard, Library, LogOut, Palette, PanelLeftClose, Rocket, Settings, Sparkles, Video,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "AI Clipper", href: "/clipper", icon: Clapperboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Media Library", href: "/media", icon: Library },
  { label: "Video Editor", href: "/editor", icon: Video },
  { label: "Caption Styles", href: "/captions", icon: Captions },
  { label: "Brand Kit", href: "/brand-kit", icon: Palette },
  { label: "Publish", href: "/publish", icon: Rocket },
  { label: "Analytics", href: "/analytics", icon: ChartNoAxesCombined },
];

export function AppShell({ children, user }: { children: React.ReactNode; user: { name: string | null; email: string; role: "USER" | "ADMIN" } }) {
  const pathname = usePathname();
  const initials = (user.name ?? user.email).split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[244px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col border-r border-white/[.07] bg-[#0a0d15]/90 p-4 backdrop-blur-xl lg:flex">
        <div className="flex h-14 items-center justify-between px-2"><Logo /><button className="text-slate-500 hover:text-white" aria-label="Perkecil sidebar"><PanelLeftClose size={18} /></button></div>
        <div className="mt-6 rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-500/10 to-transparent p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-300"><Sparkles size={14} /> Local preview</div>
          <p className="mt-1.5 text-[11px] leading-4 text-slate-500">Phase 2 · Private local media</p>
        </div>
        <nav className="mt-5 flex-1 space-y-1">
          {nav.map(({ label, href, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} className={cn("group flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition", active ? "bg-gradient-to-r from-violet-500/25 to-violet-500/5 text-white ring-1 ring-violet-400/20" : "text-slate-500 hover:bg-white/[.04] hover:text-slate-200")}><Icon size={17} className={active ? "text-violet-400" : "group-hover:text-slate-300"} />{label}</Link>;
          })}
        </nav>
        <Link href="/settings" className="flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-slate-500 hover:bg-white/[.04] hover:text-white"><Settings size={17} />Settings</Link>
        <button onClick={logout} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-slate-500 hover:bg-rose-500/[.06] hover:text-rose-300"><LogOut size={17} />Logout</button>
      </aside>

      <div className="lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-white/[.07] bg-[#080a10]/75 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="lg:hidden"><Logo /></div>
          <div className="hidden lg:block"><p className="text-[11px] font-semibold uppercase tracking-[.2em] text-slate-600">Workspace</p><p className="text-sm font-semibold text-slate-300">Creator Studio</p></div>
          <div className="flex items-center gap-2">
            <Button size="sm"><Sparkles size={14} /> Upgrade</Button>
            <button className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.08] bg-white/[.03] text-slate-400 hover:text-white" aria-label="Notifikasi"><Bell size={16} /></button>
            <Link href="/settings" className="ml-1 flex items-center gap-2 rounded-xl p-1.5 hover:bg-white/[.04]" aria-label="Menu profil"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 text-xs font-bold text-white">{initials}</span><span className="hidden text-left xl:block"><span className="block max-w-28 truncate text-[11px] font-semibold">{user.name ?? "Creator"}</span><span className="block text-[9px] text-slate-500">{user.role}</span></span><ChevronDown size={14} className="hidden text-slate-500 sm:block" /></Link>
          </div>
        </header>
        <main>{children}</main>
        <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/10 bg-[#10131e]/95 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
          {nav.slice(0, 5).map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={cn("flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[9px]", pathname === href ? "bg-violet-500/15 text-violet-300" : "text-slate-500")}><Icon size={18} /><span>{label.replace(" Styles", "")}</span></Link>)}
        </nav>
      </div>
    </div>
  );
}
