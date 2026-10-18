import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-white/[.08] bg-[#111522]/80 shadow-[0_18px_60px_rgba(0,0,0,.22)]", className)} {...props} />;
}
