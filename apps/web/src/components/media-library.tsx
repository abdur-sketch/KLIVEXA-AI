"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, FileVideo2, Link2, LoaderCircle, Play, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import type { MediaDTO, MediaJobDTO } from "@/server/media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ProjectOption = { id: string; title: string };
type ApiError = { error?: { message?: string } };

export function MediaLibrary({ initialMedia, projects }: { initialMedia: MediaDTO[]; projects: ProjectOption[] }) {
  const [media, setMedia] = useState(initialMedia);
  const [pending, setPending] = useState<"upload" | "youtube" | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  async function json<T>(response: Response): Promise<T> {
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error((body as ApiError | null)?.error?.message ?? "Permintaan gagal.");
    return body as T;
  }

  function upsert(item: MediaDTO) {
    setMedia((current) => [item, ...current.filter((entry) => entry.id !== item.id)]);
  }

  async function refreshMedia(id: string) {
    const result = await json<{ media: MediaDTO }>(await fetch(`/api/media/${id}`));
    upsert(result.media);
  }

  async function poll(job: MediaJobDTO) {
    try {
      const result = await json<{ job: MediaJobDTO }>(await fetch(`/api/media/jobs/${job.id}`));
      if (["COMPLETED", "FAILED", "CANCELLED"].includes(result.job.status)) {
        await refreshMedia(job.mediaAssetId);
        return;
      }
      timers.current.push(window.setTimeout(() => void poll(job), 800));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Status job tidak dapat diperbarui.");
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending("upload"); setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const result = await json<{ media: MediaDTO; job?: MediaJobDTO }>(await fetch("/api/media/upload", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: form }));
      upsert(result.media); formElement.reset();
      if (result.job) void poll(result.job);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Upload gagal."); }
    finally { setPending(null); }
  }

  async function importYouTube(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending("youtube"); setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const result = await json<{ media: MediaDTO; job?: MediaJobDTO }>(await fetch("/api/media/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ projectId: form.get("projectId"), url: form.get("url"), rightsConfirmed: form.get("rightsConfirmed") === "on" }),
      }));
      upsert(result.media); formElement.reset();
      if (result.job) void poll(result.job);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Import URL gagal."); }
    finally { setPending(null); }
  }

  async function remove(item: MediaDTO) {
    if (!window.confirm(`Hapus media “${item.title ?? item.originalName ?? item.id}”?`)) return;
    setPending(item.id); setError(null);
    try {
      await json<null>(await fetch(`/api/media/${item.id}`, { method: "DELETE" }));
      setMedia((current) => current.filter((entry) => entry.id !== item.id));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Media gagal dihapus."); }
    finally { setPending(null); }
  }

  const disabled = projects.length === 0;
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><Badge>Phase 2 · Private media</Badge><h1 className="mt-3 font-[family-name:var(--font-jakarta)] text-3xl font-bold tracking-tight">Media Library</h1><p className="mt-2 text-sm text-slate-500">Upload lokal privat dan metadata YouTube resmi, terisolasi per pengguna dan proyek.</p></div>
        <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[.06] px-3 py-2 text-[11px] text-emerald-300"><ShieldCheck size={14} className="mr-1.5 inline" />No YouTube downloads</div>
      </div>

      {disabled && <p role="alert" className="mt-5 rounded-xl border border-amber-400/15 bg-amber-500/10 p-3 text-xs text-amber-200">Buat satu proyek aktif sebelum menambahkan media.</p>}
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/15 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}

      <div className="mt-7 grid gap-4 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300"><UploadCloud size={18} /></span><div><h2 className="text-sm font-semibold">Upload video</h2><p className="mt-0.5 text-[11px] text-slate-500">MP4, MOV, atau WebM · signature dan FFprobe diperiksa</p></div></div>
          <form className="mt-5 grid gap-3" onSubmit={upload}>
            <ProjectSelect projects={projects} />
            <input aria-label="File video" name="file" type="file" required disabled={disabled} accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" className="block w-full rounded-xl border border-dashed border-white/10 bg-[#090c14] p-3 text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500/15 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-violet-300" />
            <Button type="submit" disabled={disabled || pending === "upload"}>{pending === "upload" ? <LoaderCircle size={16} className="animate-spin" /> : <UploadCloud size={16} />} Upload & inspect</Button>
          </form>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-300"><Link2 size={18} /></span><div><h2 className="text-sm font-semibold">YouTube metadata</h2><p className="mt-0.5 text-[11px] text-slate-500">Judul dan thumbnail melalui oEmbed resmi</p></div></div>
          <form className="mt-5 grid gap-3" onSubmit={importYouTube}>
            <ProjectSelect projects={projects} />
            <input aria-label="URL YouTube" name="url" type="url" required disabled={disabled} placeholder="https://www.youtube.com/watch?v=..." className="h-11 rounded-xl border border-white/10 bg-[#090c14] px-3 text-sm outline-none focus:border-violet-400/50" />
            <label className="flex items-start gap-2 text-[11px] leading-4 text-slate-500"><input name="rightsConfirmed" type="checkbox" required className="mt-0.5 accent-violet-500" />Saya memiliki atau mendapat izin untuk menggunakan video ini.</label>
            <Button type="submit" disabled={disabled || pending === "youtube"}>{pending === "youtube" ? <LoaderCircle size={16} className="animate-spin" /> : <Link2 size={16} />} Fetch metadata</Button>
          </form>
        </Card>
      </div>

      <div className="mb-4 mt-10 flex items-end justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-violet-400">User-isolated storage</p><h2 className="mt-1 text-xl font-bold">Your media</h2></div><span className="text-xs text-slate-600">{media.length} items</span></div>
      {media.length === 0 ? <Card className="grid min-h-60 place-items-center border-dashed bg-white/[.015] p-8 text-center"><div><FileVideo2 size={24} className="mx-auto text-violet-300" /><h3 className="mt-4 text-sm font-semibold">Belum ada media</h3><p className="mt-2 text-xs text-slate-500">Upload file atau hubungkan metadata YouTube.</p></div></Card> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{media.map((item) => <MediaCard key={item.id} item={item} deleting={pending === item.id} onDelete={() => remove(item)} />)}</div>}
    </div>
  );
}

function ProjectSelect({ projects }: { projects: ProjectOption[] }) {
  return <select aria-label="Project tujuan" name="projectId" required disabled={projects.length === 0} className="h-11 rounded-xl border border-white/10 bg-[#090c14] px-3 text-sm text-slate-300 outline-none focus:border-violet-400/50"><option value="">Pilih project...</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>;
}

function MediaCard({ item, deleting, onDelete }: { item: MediaDTO; deleting: boolean; onDelete: () => void }) {
  const busy = item.status === "QUEUED" || item.status === "PROCESSING";
  return <Card data-testid="media-card" className="overflow-hidden">
    <div className="relative aspect-video bg-[#080a10]">
      {item.previewUrl ? <video className="h-full w-full object-contain" controls preload="metadata" poster={item.thumbnailUrl ?? undefined} src={item.previewUrl} /> : item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-700">{busy ? <LoaderCircle size={28} className="animate-spin" /> : <Play size={28} />}</div>}
      <span className="absolute left-3 top-3"><StatusBadge status={item.status} /></span>
    </div>
    <div className="p-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title ?? item.originalName ?? "Menyiapkan media…"}</p><p className="mt-1 truncate text-[11px] text-slate-500">{item.projectTitle} · {item.sourceType === "YOUTUBE" ? "YouTube metadata" : item.mimeType}</p></div><button type="button" aria-label="Hapus media" onClick={onDelete} disabled={deleting} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-rose-500/10 hover:text-rose-300">{deleting ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={15} />}</button></div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-slate-500"><span>{formatDuration(item.durationMs)}</span><span>{item.width && item.height ? `${item.width}×${item.height}` : "Resolution pending"}</span><span>{item.videoCodec ?? "Codec pending"}</span><span>{formatBytes(item.sizeBytes)}</span></div>
      {item.error && <p className="mt-3 line-clamp-2 text-[11px] text-rose-300">{item.error}</p>}
      {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200">Open on YouTube <ExternalLink size={11} /></a>}
    </div>
  </Card>;
}

function StatusBadge({ status }: { status: MediaDTO["status"] }) {
  if (status === "READY") return <Badge className="border-emerald-400/20 bg-emerald-950/80 text-emerald-300"><CheckCircle2 size={11} className="mr-1" />Ready</Badge>;
  if (status === "FAILED") return <Badge className="border-rose-400/20 bg-rose-950/80 text-rose-300">Failed</Badge>;
  return <Badge className="border-amber-400/20 bg-amber-950/80 text-amber-200"><Clock3 size={11} className="mr-1" />{status === "QUEUED" ? "Queued" : "Processing"}</Badge>;
}

function formatDuration(value: number | null) {
  if (!value) return "Duration pending";
  const seconds = Math.round(value / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatBytes(value: string | null) {
  if (!value) return "Remote metadata";
  const bytes = Number(value);
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.ceil(bytes / 1_024)} KB`;
}
