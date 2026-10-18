import Link from "next/link";
import { Archive, ArrowUpRight, Clock3, Film, FolderKanban, Plus, Sparkles } from "lucide-react";
import { UrlImport } from "@/components/url-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDashboardStats, listProjects } from "@/server/projects";
import { requirePageSession } from "@/server/session";

export default async function DashboardPage() {
  const { user } = await requirePageSession();
  const [stats, projects] = await Promise.all([getDashboardStats(user), listProjects(user)]);
  return (
    <div className="relative isolate min-h-[calc(100vh-72px)] overflow-hidden px-4 pb-28 pt-7 sm:px-7 lg:px-9 lg:pb-12">
      <div className="grid-fade pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto max-w-[1420px]">
        <section className="noise relative overflow-hidden rounded-[28px] border border-violet-400/15 bg-[#10131f] px-5 py-8 shadow-[0_30px_100px_rgba(27,15,67,.25)] sm:px-9 sm:py-10">
          <div className="absolute -right-16 -top-24 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="relative grid items-center gap-10 xl:grid-cols-[.8fr_1.2fr]">
            <div>
              <Badge><Sparkles size={12} className="mr-1.5" /> Phase 2 · Media foundation</Badge>
              <h1 className="mt-5 max-w-xl font-[family-name:var(--font-jakarta)] text-3xl font-bold leading-tight tracking-tight sm:text-4xl xl:text-[46px]">Selamat datang, <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">{user.name?.split(" ")[0] ?? "Creator"}.</span></h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-400 sm:text-base">Import metadata YouTube resmi atau upload video privat ke workspace lokal Anda.</p>
              <Button asChild className="mt-6"><Link href="/media"><Plus size={16} /> Import media</Link></Button>
            </div>
            <div className="rounded-[24px] border border-white/[.08] bg-[#090c14]/80 p-4 shadow-2xl sm:p-6">
              <div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold">YouTube metadata import</p><p className="mt-1 text-xs text-slate-500">oEmbed resmi—tanpa mengunduh video.</p></div><span className="hidden rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 sm:block">METADATA ONLY</span></div>
              <UrlImport projects={projects.filter((project) => !project.archivedAt).map(({ id, title }) => ({ id, title }))} />
            </div>
          </div>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Total projects" value={String(stats.total)} note="Database lokal" icon={<FolderKanban size={18} />} tone="violet" />
          <Metric title="Active projects" value={String(stats.active)} note="Belum diarsipkan" icon={<Film size={18} />} tone="cyan" />
          <Metric title="Archived" value={String(stats.archived)} note="Dapat dipulihkan" icon={<Archive size={18} />} tone="pink" />
          <Metric title="Media ready" value={String(stats.mediaReady)} note={`${stats.mediaProcessing} processing`} icon={<Sparkles size={18} />} tone="emerald" />
        </section>

        <section className="mt-9">
          <div className="mb-4 flex items-end justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-violet-400">Database workspace</p><h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-xl font-bold">Recent projects</h2></div><Button asChild variant="ghost" size="sm"><Link href="/projects">Kelola semua <ArrowUpRight size={14} /></Link></Button></div>
          {stats.recent.length === 0 ? <Card className="grid min-h-48 place-items-center border-dashed bg-white/[.015] p-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><FolderKanban size={20} /></span><h3 className="mt-4 text-sm font-semibold">Belum ada proyek</h3><p className="mt-2 text-xs text-slate-500">Buat proyek pertama untuk memulai workspace Anda.</p></div></Card> : <div className="grid gap-4 xl:grid-cols-3">{stats.recent.map((project) => <Card key={project.id} className="group p-5 transition hover:-translate-y-1 hover:border-violet-400/25"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Badge className={project.archivedAt ? "border-slate-400/20 bg-slate-400/10 text-slate-300" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"}>{project.archivedAt ? "Archived" : project.status}</Badge><h3 className="mt-4 truncate text-sm font-semibold">{project.title}</h3><p className="mt-2 line-clamp-2 min-h-9 text-xs leading-5 text-slate-500">{project.description || "Belum ada deskripsi."}</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Film size={17} /></span></div><div className="mt-5 flex items-center justify-between border-t border-white/[.06] pt-3 text-[11px] text-slate-500"><span>{project.clipCount} clips</span><span className="flex items-center gap-1"><Clock3 size={12} /> {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(project.updatedAt))}</span></div></Card>)}</div>}
        </section>
      </div>
    </div>
  );
}

function Metric({ title, value, note, icon, tone }: { title: string; value: string; note: string; icon: React.ReactNode; tone: "violet" | "cyan" | "pink" | "emerald" }) {
  const tones = { violet: "bg-violet-500/10 text-violet-300", cyan: "bg-cyan-500/10 text-cyan-300", pink: "bg-pink-500/10 text-pink-300", emerald: "bg-emerald-500/10 text-emerald-300" };
  return <Card className="p-4"><div className="flex items-center justify-between"><span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}>{icon}</span><ArrowUpRight size={15} className="text-slate-700" /></div><p className="mt-5 text-2xl font-bold tracking-tight">{value}</p><div className="mt-1 flex items-center justify-between gap-2"><p className="text-xs font-medium text-slate-400">{title}</p><p className="text-[10px] text-slate-600">{note}</p></div></Card>;
}
