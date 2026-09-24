import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-tss-border bg-white px-3 py-1 text-sm text-tss-ink shadow-[0_1px_0_rgba(10,28,54,0.02)] transition-colors placeholder:text-tss-slate/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tss-steel/25 focus-visible:border-tss-steel/40 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";
