import { UserRound } from "lucide-react";
import { ProfileForm } from "@/components/profile-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requirePageSession } from "@/server/session";

export default async function SettingsPage() {
  const { user } = await requirePageSession();
  return <div className="relative min-h-[calc(100vh-72px)] px-4 pb-28 pt-7 sm:px-7 lg:px-9 lg:pb-12"><div className="grid-fade pointer-events-none absolute inset-0" /><div className="relative mx-auto max-w-3xl"><Badge>Account security</Badge><h1 className="mt-3 font-[family-name:var(--font-jakarta)] text-3xl font-bold">Settings</h1><p className="mt-2 text-sm text-slate-500">Kelola profil lokal dan informasi akses workspace.</p><Card className="mt-7 p-5 sm:p-7"><div className="mb-6 flex items-center gap-3 border-b border-white/[.06] pb-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><UserRound size={20} /></span><div><h2 className="text-sm font-semibold">Profile</h2><p className="mt-1 text-xs text-slate-500">Perubahan dicatat dalam audit log.</p></div></div><ProfileForm initialName={user.name ?? ""} email={user.email} role={user.role} /></Card></div></div>;
}
