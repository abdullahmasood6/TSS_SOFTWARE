import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-slate-100/90 text-slate-700 ring-1 ring-slate-200/80",
    info: "bg-tss-steel-soft text-tss-navy ring-1 ring-tss-steel/15",
    success: "bg-emerald-50 text-tss-success ring-1 ring-emerald-200/70",
    warning: "bg-amber-50 text-tss-warning ring-1 ring-amber-200/80",
    danger: "bg-red-50 text-tss-danger ring-1 ring-red-200/70",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.04em]",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
