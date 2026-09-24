import { ROLE_META } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export function RoleNotice({
  role,
  message,
}: {
  role?: Role | string;
  message?: string;
}) {
  const meta = role ? ROLE_META[role as Role] : null;
  return (
    <div className="mb-4 rounded-md border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
      {message ||
        (meta
          ? `Your ${meta.label} role is read-only here. ${meta.summary}`
          : "Your role cannot edit this section.")}
    </div>
  );
}

export function RoleFocusBanner({
  role,
  name,
}: {
  role: Role | string;
  name: string;
}) {
  const meta = ROLE_META[role as Role];
  if (!meta) return null;
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-tss-border bg-gradient-to-r from-slate-50 via-white to-sky-50/60 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tss-slate">
            Signed in as {meta.label}
          </p>
          <p className="mt-0.5 text-sm text-tss-navy">
            Hi {name.split(" ")[0]} — {meta.summary}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {meta.focus.map((f) => (
            <span
              key={f}
              className="rounded border border-tss-border/80 bg-white px-2 py-0.5 text-[11px] font-medium text-tss-slate"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
