"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Permintaan gagal.");
      window.location.assign("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Permintaan gagal.");
    } finally {
      setPending(false);
    }
  }

  const registering = mode === "register";
  return (
    <Card className="border-violet-400/15 bg-[#10131f]/90 p-6 shadow-[0_30px_100px_rgba(30,15,70,.28)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-400">{registering ? "Create workspace" : "Welcome back"}</p>
      <h2 className="mt-3 font-[family-name:var(--font-jakarta)] text-2xl font-bold">{registering ? "Buat akun KLIVEXA" : "Masuk ke KLIVEXA"}</h2>
      <p className="mt-2 text-sm text-slate-500">{registering ? "Data akun dan proyek disimpan di database lokal." : "Gunakan kredensial workspace lokal Anda."}</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        {registering && <Field icon={<UserRound size={16} />} name="name" type="text" label="Nama" placeholder="Nama Anda" autoComplete="name" />}
        <Field icon={<Mail size={16} />} name="email" type="email" label="Email" placeholder="nama@contoh.com" autoComplete="email" />
        <div><label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-300">Password</label><div className="flex items-center rounded-xl border border-white/10 bg-[#090c14] px-3 focus-within:border-violet-400/50"><LockKeyhole size={16} className="text-slate-600" /><input id="password" name="password" type={showPassword ? "text" : "password"} required minLength={registering ? 12 : 1} autoComplete={registering ? "new-password" : "current-password"} placeholder={registering ? "Minimal 12 karakter" : "Password Anda"} className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-700" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-600 hover:text-white" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
        {registering && <p className="text-[10px] leading-4 text-slate-600">Gunakan huruf besar, huruf kecil, angka, dan simbol.</p>}
        {error && <p role="alert" className="rounded-xl border border-rose-400/15 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={16} /> : null}{pending ? "Memproses..." : registering ? "Buat akun" : "Masuk"}{!pending && <ArrowRight size={15} />}</Button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-500">{registering ? "Sudah punya akun?" : "Belum punya akun?"} <Link href={registering ? "/login" : "/register"} className="font-semibold text-violet-300 hover:text-violet-200">{registering ? "Masuk" : "Daftar"}</Link></p>
    </Card>
  );
}

function Field({ icon, name, type, label, placeholder, autoComplete }: { icon: React.ReactNode; name: string; type: string; label: string; placeholder: string; autoComplete: string }) {
  return <div><label htmlFor={name} className="mb-1.5 block text-xs font-medium text-slate-300">{label}</label><div className="flex items-center rounded-xl border border-white/10 bg-[#090c14] px-3 focus-within:border-violet-400/50">{<span className="text-slate-600">{icon}</span>}<input id={name} name={name} type={type} required autoComplete={autoComplete} placeholder={placeholder} className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-700" /></div></div>;
}
