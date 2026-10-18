"use client";

import { useState } from "react";
import { Captions, CheckCircle2, Crop, FileVideo2, Play, SlidersHorizontal, Sparkles, UploadCloud, WandSparkles } from "lucide-react";
import { UrlImport } from "@/components/url-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const clips = [
  { title: "Mulai dari hal kecil dulu.", duration: "00:58", score: 96, tone: "from-cyan-400/35 via-blue-500/25 to-violet-600/40" },
  { title: "Ini mindset yang mengubah segalanya.", duration: "00:46", score: 93, tone: "from-fuchsia-400/30 via-rose-500/20 to-violet-600/40" },
  { title: "Jangan takut gagal, itu bagian proses.", duration: "00:52", score: 89, tone: "from-amber-300/30 via-orange-500/20 to-purple-600/40" },
  { title: "Konsistensi lebih penting.", duration: "00:49", score: 87, tone: "from-emerald-300/25 via-cyan-500/20 to-indigo-600/40" },
];

export default function ClipperPage() {
  const [ready, setReady] = useState(false);
  return (
    <div className="relative min-h-[calc(100vh-72px)] px-4 pb-28 pt-7 sm:px-7 lg:px-9 lg:pb-12">
      <div className="grid-fade pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-[1420px]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><Badge><Sparkles size={12} className="mr-1.5" /> Interactive mock</Badge><h1 className="mt-3 font-[family-name:var(--font-jakarta)] text-3xl font-bold tracking-tight">AI Clipper</h1><p className="mt-2 text-sm text-slate-500">Temukan momen kuat dari video panjang, lalu siapkan untuk diedit.</p></div>
          <Button variant="secondary"><UploadCloud size={16} /> Upload file <span className="text-[10px] text-slate-500">(Phase 2)</span></Button>
        </div>

        <Card className="mt-7 overflow-hidden border-violet-400/15 p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-400"><FileVideo2 size={20} /></span><div><h2 className="text-sm font-semibold">Import from YouTube</h2><p className="text-xs text-slate-500">UI demo—tidak mengunduh atau menganalisis video.</p></div></div>
          <UrlImport onComplete={() => setReady(true)} />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Option icon={<WandSparkles size={16} />} title="Auto highlights" description="3–10 rekomendasi" />
            <Option icon={<Captions size={16} />} title="Dynamic captions" description="Bahasa otomatis" />
            <Option icon={<Crop size={16} />} title="Smart reframe" description="Vertikal 9:16" />
          </div>
        </Card>

        <div className="mt-8 flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-violet-400">Candidate moments</p><h2 className="mt-1 text-xl font-bold">{ready ? "4 demo clips ditemukan" : "Preview hasil"}</h2></div><Button variant="ghost" size="sm"><SlidersHorizontal size={15} /> Filter</Button></div>
        {!ready ? (
          <Card className="mt-4 grid min-h-64 place-items-center border-dashed bg-white/[.015] p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-400"><Sparkles size={22} /></span><h3 className="mt-4 text-sm font-semibold">Klip demo akan muncul di sini</h3><p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">Masukkan URL YouTube yang valid dan konfirmasi hak penggunaan untuk menjalankan simulasi Phase 0.</p></div></Card>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {clips.map((clip, index) => <Card key={clip.title} className="overflow-hidden transition hover:-translate-y-1 hover:border-violet-400/30"><div className={`relative aspect-[9/12] overflow-hidden bg-gradient-to-br ${clip.tone}`}><div className="absolute inset-0 grid-fade" /><div className="absolute left-3 top-3"><Badge className="border-fuchsia-300/30 bg-fuchsia-500/20 text-fuchsia-200">✦ {clip.score}% match</Badge></div><div className="absolute inset-x-4 bottom-10 text-center text-lg font-extrabold uppercase leading-tight tracking-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,.6)]">{clip.title.split(" ").map((word, i) => <span key={`${word}-${i}`} className={i === 1 ? "text-cyan-300" : ""}>{word} </span>)}</div><button aria-label={`Putar ${clip.title}`} className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/30 backdrop-blur-sm"><Play size={18} fill="white" /></button><span className="absolute bottom-3 left-3 text-xs font-semibold">{clip.duration}</span></div><div className="flex items-center justify-between p-4"><div><p className="text-xs font-semibold">Moment #{index + 1}</p><p className="mt-1 text-[10px] text-slate-500">Hook kuat · konteks utuh</p></div><button aria-label={`Pilih ${clip.title}`} className="text-violet-400"><CheckCircle2 size={20} /></button></div></Card>)}
          </div>
        )}
      </div>
    </div>
  );
}

function Option({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.025] p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/10 text-violet-300">{icon}</span><div><p className="text-xs font-semibold">{title}</p><p className="mt-0.5 text-[10px] text-slate-500">{description}</p></div></div>;
}
