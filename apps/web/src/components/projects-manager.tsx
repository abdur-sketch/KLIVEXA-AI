"use client";

import { FormEvent, useState } from "react";
import { Archive, ArchiveRestore, FolderKanban, LoaderCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { ProjectDTO } from "@/server/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ApiError = { error?: { message?: string } };

export function ProjectsManager({ initialProjects }: { initialProjects: ProjectDTO[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visible = projects.filter((project) => project.title.toLowerCase().includes(query.toLowerCase()));

  async function request<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error((body as ApiError | null)?.error?.message ?? "Permintaan gagal.");
    return body as T;
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPendingId("create"); setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const { project } = await request<{ project: ProjectDTO }>("/api/projects", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) });
      setProjects((current) => [project, ...current]); setShowCreate(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Permintaan gagal."); }
    finally { setPendingId(null); }
  }

  async function update(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); setPendingId(id); setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const { project } = await request<{ project: ProjectDTO }>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(Object.fromEntries(form.entries())) });
      setProjects((current) => current.map((item) => item.id === id ? project : item)); setEditingId(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Permintaan gagal."); }
    finally { setPendingId(null); }
  }

  async function archive(project: ProjectDTO) {
    setPendingId(project.id); setError(null);
    try {
      const result = await request<{ project: ProjectDTO }>(`/api/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ archived: !project.archivedAt }) });
      setProjects((current) => current.map((item) => item.id === project.id ? result.project : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Permintaan gagal."); }
    finally { setPendingId(null); }
  }

  async function remove(project: ProjectDTO) {
    if (!window.confirm(`Hapus proyek “${project.title}”? Data akan di-soft-delete.`)) return;
    setPendingId(project.id); setError(null);
    try {
      await request<null>(`/api/projects/${project.id}`, { method: "DELETE" });
      setProjects((current) => current.filter((item) => item.id !== project.id));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Permintaan gagal."); }
    finally { setPendingId(null); }
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Badge>PostgreSQL · User isolated</Badge><h1 className="mt-3 font-[family-name:var(--font-jakarta)] text-3xl font-bold tracking-tight">Projects</h1><p className="mt-2 text-sm text-slate-500">Buat, ubah, arsipkan, dan hapus proyek workspace Anda.</p></div><Button onClick={() => setShowCreate(true)} data-testid="new-project"><Plus size={16} /> New project</Button></div>
      <div className="mt-7 flex items-center rounded-xl border border-white/[.08] bg-[#10131f] px-3 focus-within:border-violet-400/40"><Search size={16} className="text-slate-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Cari proyek" placeholder="Cari project..." className="h-11 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-700" /></div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/15 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}
      {showCreate && <Card className="mt-5 border-violet-400/20 p-5"><form onSubmit={create}><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Project baru</h2><button type="button" onClick={() => setShowCreate(false)} aria-label="Tutup"><X size={17} className="text-slate-500" /></button></div><ProjectFields /><div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Batal</Button><Button type="submit" disabled={pendingId === "create"}>{pendingId === "create" && <LoaderCircle size={15} className="animate-spin" />}Simpan</Button></div></form></Card>}
      {visible.length === 0 ? <Card className="mt-5 grid min-h-64 place-items-center border-dashed bg-white/[.015] p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-300"><FolderKanban size={22} /></span><h2 className="mt-4 text-sm font-semibold">{query ? "Tidak ada hasil" : "Workspace masih kosong"}</h2><p className="mt-2 text-xs text-slate-500">{query ? "Coba kata kunci lain." : "Buat proyek pertama untuk memulai."}</p></div></Card> : <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((project) => <Card key={project.id} data-testid="project-card" className="p-5">{editingId === project.id ? <form onSubmit={(event) => update(event, project.id)}><ProjectFields project={project} /><div className="mt-4 flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>Batal</Button><Button type="submit" size="sm" disabled={pendingId === project.id}>Simpan</Button></div></form> : <><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Badge className={project.archivedAt ? "border-slate-400/20 bg-slate-400/10 text-slate-300" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"}>{project.archivedAt ? "Archived" : project.status}</Badge><h2 className="mt-4 truncate text-sm font-semibold">{project.title}</h2><p className="mt-2 line-clamp-3 min-h-12 text-xs leading-5 text-slate-500">{project.description || "Belum ada deskripsi."}</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><FolderKanban size={17} /></span></div><div className="mt-5 flex items-center justify-between border-t border-white/[.06] pt-3"><span className="text-[11px] text-slate-600">Updated {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(project.updatedAt))}</span><div className="flex gap-1"><IconButton label="Edit proyek" onClick={() => setEditingId(project.id)} icon={<Pencil size={15} />} /><IconButton label={project.archivedAt ? "Pulihkan proyek" : "Arsipkan proyek"} onClick={() => archive(project)} disabled={pendingId === project.id} icon={project.archivedAt ? <ArchiveRestore size={15} /> : <Archive size={15} />} /><IconButton label="Hapus proyek" onClick={() => remove(project)} disabled={pendingId === project.id} destructive icon={<Trash2 size={15} />} /></div></div></>}</Card>)}</div>}
    </div>
  );
}

function ProjectFields({ project }: { project?: ProjectDTO }) {
  return <div className="mt-4 grid gap-3"><div><label className="mb-1.5 block text-xs text-slate-400" htmlFor={`title-${project?.id ?? "new"}`}>Judul</label><input id={`title-${project?.id ?? "new"}`} name="title" required minLength={2} maxLength={120} defaultValue={project?.title} placeholder="Nama project" className="h-11 w-full rounded-xl border border-white/10 bg-[#090c14] px-3 text-sm outline-none focus:border-violet-400/50" /></div><div><label className="mb-1.5 block text-xs text-slate-400" htmlFor={`description-${project?.id ?? "new"}`}>Deskripsi</label><textarea id={`description-${project?.id ?? "new"}`} name="description" maxLength={1000} defaultValue={project?.description ?? ""} placeholder="Tujuan atau catatan project" className="min-h-20 w-full resize-y rounded-xl border border-white/10 bg-[#090c14] p-3 text-sm outline-none focus:border-violet-400/50" /></div></div>;
}

function IconButton({ label, icon, onClick, disabled, destructive }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; destructive?: boolean }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={`grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-40 ${destructive ? "text-slate-600 hover:bg-rose-500/10 hover:text-rose-300" : "text-slate-500 hover:bg-white/[.06] hover:text-white"}`}>{disabled ? <LoaderCircle size={14} className="animate-spin" /> : icon}</button>;
}
