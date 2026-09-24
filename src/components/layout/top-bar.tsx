import Link from "next/link";
import { getWorkQueueCounts } from "@/lib/work-queue";
import { auth } from "@/lib/auth";
import { Bell, Search, Ship, UserRound } from "lucide-react";
import { GlobalSearch } from "@/components/layout/global-search";

export async function TopBar() {
  const [counts, session] = await Promise.all([getWorkQueueCounts(), auth()]);

  return (
    <header className="sticky top-0 z-20 border-b border-tss-border/70 bg-white/85 px-4 py-2.5 backdrop-blur-md sm:px-6">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-4">
        <div className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-tss-slate lg:block lg:w-28">
          Console
        </div>
        <div className="flex-1">
          <GlobalSearch />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/dashboard?tab=needs-rfq"
            className="inline-flex items-center gap-1.5 rounded-md border border-tss-border bg-white px-2.5 py-1.5 text-xs font-semibold text-tss-navy shadow-[0_1px_0_rgba(10,28,54,0.02)] transition hover:border-tss-steel/30 hover:bg-tss-steel-soft/60"
            title="Action items"
          >
            <Bell className="h-3.5 w-3.5 text-tss-slate" />
            Actions
            <span
              className={
                counts.actionItems > 0
                  ? "rounded bg-tss-danger px-1.5 py-0.5 text-[10px] font-bold text-white"
                  : "rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600"
              }
            >
              {counts.actionItems}
            </span>
          </Link>
          <Link
            href="/enquiries?mine=1"
            className="inline-flex items-center gap-1.5 rounded-md border border-tss-border bg-white px-2.5 py-1.5 text-xs font-semibold text-tss-navy shadow-[0_1px_0_rgba(10,28,54,0.02)] transition hover:border-tss-steel/30 hover:bg-tss-steel-soft/60"
          >
            My work
          </Link>
          <Link
            href="/vessels"
            className="inline-flex items-center gap-1.5 rounded-md border border-tss-border bg-white px-2.5 py-1.5 text-xs font-semibold text-tss-navy shadow-[0_1px_0_rgba(10,28,54,0.02)] transition hover:border-tss-steel/30 hover:bg-tss-steel-soft/60"
          >
            <Ship className="h-3.5 w-3.5 text-tss-slate" />
            Vessels
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 rounded-md border border-tss-border bg-white px-2.5 py-1.5 text-xs font-semibold text-tss-navy shadow-[0_1px_0_rgba(10,28,54,0.02)] transition hover:border-tss-steel/30 hover:bg-tss-steel-soft/60"
            title={session?.user?.name || "Profile"}
          >
            <UserRound className="h-3.5 w-3.5 text-tss-slate" />
            Profile
          </Link>
        </div>
      </div>
    </header>
  );
}

export function TopBarFallback() {
  return (
    <header className="sticky top-0 z-20 border-b border-tss-border/80 bg-white/90 px-6 py-3">
      <div className="flex items-center gap-2 text-xs text-tss-slate">
        <Search className="h-3.5 w-3.5" /> Loading console…
      </div>
    </header>
  );
}
