import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="noise relative grid min-h-screen overflow-hidden lg:grid-cols-[1.05fr_.95fr]">
      <div className="grid-fade absolute inset-0" />
      <section className="relative hidden flex-col justify-between border-r border-white/[.07] p-12 lg:flex">
        <Logo />
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-400">Premium AI Content Studio</p>
          <h1 className="mt-5 font-[family-name:var(--font-jakarta)] text-5xl font-bold leading-[1.12] tracking-tight">One Link.<br /><span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">Infinite Moments.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">Workspace lokal yang aman untuk mengelola proyek sebelum alur AI video diaktifkan.</p>
        </div>
        <p className="text-xs text-slate-600">Local-only · Phase 1</p>
      </section>
      <section className="relative grid place-items-center p-5 sm:p-10">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="relative w-full max-w-md"><div className="mb-10 lg:hidden"><Logo /></div>{children}</div>
      </section>
    </main>
  );
}
