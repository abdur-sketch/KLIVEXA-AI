"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, Link2, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isValidYouTubeUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";

export function UrlImport({ projects = [], onComplete }: { projects?: Array<{ id: string; title: string }>; onComplete?: () => void }) {
  const [availableProjects, setAvailableProjects] = useState(projects);
  const [url, setUrl] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [rights, setRights] = useState(false);
  const [state, setState] = useState<"idle" | "invalid" | "working" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (projects.length > 0) return;
    void fetch("/api/projects").then((response) => response.json()).then((body: { projects?: Array<{ id: string; title: string; archivedAt: string | null }> }) => {
      const active = body.projects?.filter((project) => !project.archivedAt) ?? [];
      setAvailableProjects(active);
      setProjectId((current) => current || active[0]?.id || "");
    }).catch(() => undefined);
  }, [projects]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isValidYouTubeUrl(url) || !rights || !projectId) { setState("invalid"); return; }
    setState("working");
    setMessage(null);
    try {
      const response = await fetch("/api/media/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ url, projectId, rightsConfirmed: true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Import gagal.");
      setState("done");
      setMessage("Metadata masuk antrean. Video YouTube tidak diunduh.");
      onComplete?.();
    } catch (error) {
      setState("invalid");
      setMessage(error instanceof Error ? error.message : "Import gagal.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className={cn("flex flex-col gap-2 rounded-2xl border bg-[#0b0e17] p-2 transition sm:flex-row", state === "invalid" ? "border-rose-400/50" : "border-white/10 focus-within:border-violet-400/50")}>
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
          <span className="grid h-6 w-7 shrink-0 place-items-center rounded-md bg-red-500 text-[10px] text-white">▶</span>
          <input value={url} onChange={(event) => { setUrl(event.target.value); setState("idle"); }} placeholder="Tempel tautan YouTube di sini..." aria-label="Tautan YouTube" className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
        </div>
        <Button type="submit" className="h-11 shrink-0" disabled={state === "working"}>
          {state === "working" ? <LoaderCircle className="animate-spin" size={16} /> : state === "done" ? <Check size={16} /> : <SparkleIcon />}
          {state === "working" ? "Menyiapkan demo" : state === "done" ? "Demo siap" : "Generate Clips"}
          {state === "idle" && <ArrowRight size={15} />}
        </Button>
      </div>
      <select value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Project tujuan" className="h-10 w-full rounded-xl border border-white/10 bg-[#090c14] px-3 text-xs text-slate-300 outline-none focus:border-violet-400/50">
        {availableProjects.length === 0 ? <option value="">Buat project aktif terlebih dahulu</option> : availableProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
      </select>
      <label className="flex cursor-pointer items-start gap-2.5 px-1 text-[11px] leading-4 text-slate-500">
        <input type="checkbox" checked={rights} onChange={(event) => { setRights(event.target.checked); setState("idle"); }} className="mt-0.5 accent-violet-500" />
        <span>Saya memiliki atau mendapat izin untuk menggunakan video ini.</span>
        <ShieldCheck size={14} className="ml-auto shrink-0 text-emerald-400/70" />
      </label>
      {state === "invalid" && <p role="alert" className="px-1 text-xs text-rose-400">{message ?? "Pilih project, masukkan URL YouTube HTTPS yang valid, dan konfirmasi hak penggunaan."}</p>}
      {state === "done" && <p className="flex items-center gap-2 px-1 text-xs text-emerald-400"><Link2 size={13} /> {message}</p>}
    </form>
  );
}

function SparkleIcon() {
  return <span aria-hidden="true" className="text-base leading-none">✦</span>;
}
