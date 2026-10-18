import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-[0_8px_30px_rgba(139,92,246,.32)] hover:-translate-y-0.5 hover:brightness-110",
        secondary: "border border-white/10 bg-white/[.06] text-white hover:bg-white/10",
        ghost: "text-slate-400 hover:bg-white/[.06] hover:text-white",
      },
      size: { default: "h-11 px-5", sm: "h-9 px-3", lg: "h-12 px-6" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
