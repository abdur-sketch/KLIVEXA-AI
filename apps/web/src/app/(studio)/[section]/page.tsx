import Link from "next/link";
import { ArrowLeft, Construction, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const titles: Record<string, string> = {
  projects: "Projects", editor: "Video Editor", captions: "Caption Styles", "brand-kit": "Brand Kit",
  publish: "Publish", analytics: "Analytics", settings: "Settings",
};

export default async function PlaceholderPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const title = titles[section] ?? "Workspace";
  return <div className="relative grid min-h-[calc(100vh-72px)] place-items-center overflow-hidden p-6"><div className="grid-fade absolute inset-0" /><Card className="relative max-w-lg p-8 text-center sm:p-12"><Badge><Sparkles size={12} className="mr-1.5" /> Roadmap preview</Badge><span className="mx-auto mt-6 grid h-16 w-16 place-items-center rounded-2xl bg-violet-500/10 text-violet-300"><Construction size={26} /></span><h1 className="mt-5 font-[family-name:var(--font-jakarta)] text-2xl font-bold">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-500">Fondasi navigasi sudah siap. Modul ini sengaja belum diaktifkan pada Phase 0 agar status produk tetap jujur dan terukur.</p><Button asChild variant="secondary" className="mt-7"><Link href="/"><ArrowLeft size={15} /> Kembali ke dashboard</Link></Button></Card></div>;
}
