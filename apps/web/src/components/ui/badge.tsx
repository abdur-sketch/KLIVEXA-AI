import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-300", className)} {...props} />;
}
