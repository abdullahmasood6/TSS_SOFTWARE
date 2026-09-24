import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-tss-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
      <div className="min-w-0">
        <div className="mb-1.5 h-0.5 w-8 rounded-full bg-tss-steel" />
        <h1 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-tss-navy">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[0.925rem] leading-relaxed text-tss-slate">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[0.7rem] border border-tss-border/90 bg-white/90 shadow-[0_1px_0_rgba(10,28,54,0.03),0_8px_24px_-18px_rgba(10,28,54,0.18)] backdrop-blur-[2px]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 h-10 w-10 rounded-full border border-dashed border-tss-border-strong bg-tss-steel-soft/40" />
      <p className="text-sm font-semibold text-tss-navy">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-tss-slate">{description}</p>
      ) : null}
    </div>
  );
}
