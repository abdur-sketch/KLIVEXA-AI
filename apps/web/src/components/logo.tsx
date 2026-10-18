import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="KLIVEXA AI">
      <svg viewBox="0 0 54 54" className="h-9 w-9 shrink-0" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="klivexa-a" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#5ee7f7" />
            <stop offset=".48" stopColor="#6366f1" />
            <stop offset="1" stopColor="#d946ef" />
          </linearGradient>
          <linearGradient id="klivexa-b" x1="0" x2="1">
            <stop stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <path d="M15 5c4 0 6 3 5 7l-3 13 20-15c3-2 6-1 4 2L27 28l15 13c3 3 0 6-4 5L18 35l-2 11c-1 4-4 6-8 4-3-1-4-4-3-8l6-31c1-4 2-6 4-6Z" fill="url(#klivexa-a)" />
        <path d="m23 29 19 12c3 2 1 6-3 5L18 35Z" fill="url(#klivexa-b)" />
      </svg>
      {!compact && <span className="font-[family-name:var(--font-jakarta)] text-base font-bold tracking-[.16em]">KLIVEXA <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">AI</span></span>}
    </div>
  );
}
