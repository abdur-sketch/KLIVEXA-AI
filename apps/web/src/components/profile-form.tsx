"use client";

import { FormEvent, useState } from "react";
import { Check, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfileForm({ initialName, email, role }: { initialName: string; email: string; role: string }) {
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setMessage(null);
    const response = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json(); setPending(false);
    setMessage(response.ok ? "Profil berhasil diperbarui." : data.error?.message ?? "Gagal memperbarui profil.");
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }
  return <form onSubmit={submit} className="space-y-4"><div><label htmlFor="profile-name" className="mb-1.5 block text-xs text-slate-400">Nama</label><input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required className="h-11 w-full rounded-xl border border-white/10 bg-[#090c14] px-3 text-sm outline-none focus:border-violet-400/50" /></div><div><label className="mb-1.5 block text-xs text-slate-400">Email</label><input value={email} disabled className="h-11 w-full rounded-xl border border-white/[.06] bg-white/[.02] px-3 text-sm text-slate-500" /></div><div className="flex items-center justify-between rounded-xl border border-white/[.06] bg-white/[.02] p-3"><span className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck size={15} className="text-emerald-400" /> Role workspace</span><span className="text-xs font-semibold text-violet-300">{role}</span></div>{message && <p role="status" className="flex items-center gap-2 text-xs text-emerald-300"><Check size={14} />{message}</p>}<div className="flex flex-wrap gap-2"><Button type="submit" disabled={pending}>{pending && <LoaderCircle size={15} className="animate-spin" />}Simpan profil</Button><Button type="button" variant="secondary" onClick={logout}><LogOut size={15} /> Logout</Button></div></form>;
}
