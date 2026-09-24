import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/permissions";
import { getWorkQueueCounts, statusesForTab, type WorkQueueTab } from "@/lib/work-queue";
import { StatusBadge } from "@/lib/status";
import { formatDate, cn } from "@/lib/utils";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, FolderOpen, CheckCircle2, Clock } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    vessel?: string;
    customer?: string;
    view?: string;
    mine?: string;
  }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const view = sp.view === "closed" ? "closed" : "in-process";
  const tab = (sp.tab as WorkQueueTab) || (view === "closed" ? "closed" : "in-process");
  const statuses = statusesForTab(tab);

  const [counts, rows] = await Promise.all([
    getWorkQueueCounts(),
    prisma.enquiry.findMany({
      where: {
        ...(statuses ? { status: { in: statuses } } : {}),
        ...(sp.mine === "1" ? { ownerId: session.user.id } : {}),
        ...(sp.q
          ? {
              OR: [
                { number: { contains: sp.q, mode: "insensitive" } },
                { subject: { contains: sp.q, mode: "insensitive" } },
                { reference: { contains: sp.q, mode: "insensitive" } },
                { vesselName: { contains: sp.q, mode: "insensitive" } },
                { customer: { name: { contains: sp.q, mode: "insensitive" } } },
              ],
            }
          : {}),
        ...(sp.vessel
          ? { vesselName: { contains: sp.vessel, mode: "insensitive" } }
          : {}),
        ...(sp.customer
          ? { customer: { name: { contains: sp.customer, mode: "insensitive" } } }
          : {}),
      },
      orderBy: [{ priority: "desc" }, { receivedAt: "desc" }],
      include: {
        customer: true,
        owner: true,
        vessel: true,
        _count: { select: { lines: true, rfqs: true, customerQuotes: true } },
      },
      take: 100,
    }),
  ]);

  const kpis = [
    {
      label: "Needs RFQ",
      value: counts.needsRfq,
      tone: counts.needsRfq > 0 ? "danger" : "ok",
      href: "/dashboard?tab=needs-rfq",
      icon: AlertTriangle,
      hint: "Send supplier RFQs",
    },
    {
      label: "Awaiting supplier",
      value: counts.awaitingSupplier,
      tone: counts.awaitingSupplier > 0 ? "warn" : "ok",
      href: "/dashboard?tab=awaiting-supplier",
      icon: Clock,
      hint: "Log inbound prices",
    },
    {
      label: "Ready to quote",
      value: counts.readyToQuote,
      tone: counts.readyToQuote > 0 ? "warn" : "ok",
      href: "/dashboard?tab=ready-to-quote",
      icon: FolderOpen,
      hint: "Build customer quotes",
    },
    {
      label: "Awaiting approval",
      value: counts.awaitingApproval,
      tone: counts.awaitingApproval > 0 ? "warn" : "ok",
      href: "/dashboard?tab=awaiting-approval",
      icon: CheckCircle2,
      hint: "Follow up customers",
    },
  ] as const;

  const processTabs: { id: WorkQueueTab; label: string; count: number }[] = [
    { id: "in-process", label: "All in process", count: counts.inProcess },
    { id: "needs-rfq", label: "Needs RFQ", count: counts.needsRfq },
    { id: "awaiting-supplier", label: "Awaiting supplier", count: counts.awaitingSupplier },
    { id: "ready-to-quote", label: "Ready to quote", count: counts.readyToQuote },
    { id: "awaiting-approval", label: "Awaiting approval", count: counts.awaitingApproval },
    { id: "unconfirmed-po", label: "Unconfirmed POs", count: counts.unconfirmedPo },
    { id: "confirmed-po", label: "Confirmed purchases", count: counts.confirmedPo },
  ];

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1.5 h-0.5 w-8 rounded-full bg-tss-steel" />
          <h1 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-tss-navy">
            Manage daily workflow
          </h1>
          <p className="mt-1.5 text-[0.925rem] text-tss-slate">
            Actionable queue for enquiries, RFQs, quotes, and purchases.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton entity="enquiries" />
          <Button asChild>
            <Link href="/enquiries/new">New enquiry</Link>
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              href={k.href}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Panel
                className={cn(
                  "tss-kpi px-4 py-4",
                  k.tone === "danger" && "border-tss-danger/35 bg-gradient-to-br from-red-50/90 to-white",
                  k.tone === "warn" && "border-amber-300/50 bg-gradient-to-br from-amber-50/70 to-white",
                  k.tone === "ok" && "bg-gradient-to-br from-white to-tss-steel-soft/30"
                )}
              >
                <div className="relative z-[1] flex items-start justify-between gap-2">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-tss-slate">
                    {k.label}
                  </div>
                  <span
                    className={cn(
                      "rounded-md p-1.5",
                      k.tone === "danger"
                        ? "bg-red-100/80 text-tss-danger"
                        : k.tone === "warn"
                          ? "bg-amber-100/80 text-tss-warning"
                          : "bg-tss-steel-soft text-tss-steel"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div
                  className={cn(
                    "relative z-[1] mt-2 text-[2rem] font-semibold tracking-[-0.04em]",
                    k.tone === "danger" ? "text-tss-danger" : "text-tss-navy"
                  )}
                >
                  {k.value}
                </div>
                <div className="relative z-[1] mt-1 text-xs text-tss-slate">{k.hint}</div>
              </Panel>
            </Link>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard?view=in-process&tab=in-process"
          className={cn(
            "rounded-md px-3.5 py-1.5 text-sm font-semibold transition",
            view === "in-process"
              ? "bg-tss-steel text-white shadow-[0_6px_16px_-10px_rgba(31,111,235,0.8)]"
              : "border border-tss-border bg-white text-tss-slate hover:bg-tss-steel-soft"
          )}
        >
          In process
          <span className="ml-1.5 opacity-80">({counts.inProcess})</span>
        </Link>
        <Link
          href="/dashboard?view=closed&tab=closed"
          className={cn(
            "rounded-md px-3.5 py-1.5 text-sm font-semibold transition",
            view === "closed"
              ? "bg-tss-navy text-white"
              : "border border-tss-border bg-white text-tss-slate hover:bg-tss-steel-soft"
          )}
        >
          Closed
          <span className="ml-1.5 opacity-80">({counts.closed})</span>
        </Link>
        <Link
          href={
            sp.mine === "1"
              ? `/dashboard?view=${view}&tab=${tab}`
              : `/dashboard?view=${view}&tab=${tab}&mine=1`
          }
          className={cn(
            "rounded-md px-3.5 py-1.5 text-sm font-semibold transition",
            sp.mine === "1"
              ? "bg-tss-navy text-white"
              : "border border-tss-border bg-white text-tss-slate hover:bg-tss-steel-soft"
          )}
        >
          My work
        </Link>
        {counts.overdue > 0 ? (
          <span className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-tss-danger">
            {counts.overdue} overdue
          </span>
        ) : null}
      </div>

      {view === "in-process" ? (
        <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-tss-border/80 bg-white/70 p-1.5 backdrop-blur">
          {processTabs.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard?tab=${t.id}`}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-semibold transition",
                tab === t.id
                  ? "bg-tss-navy text-white shadow-sm"
                  : "text-tss-slate hover:bg-tss-steel-soft/80 hover:text-tss-navy"
              )}
            >
              {t.label}
              <span className="ml-1 opacity-70">({t.count})</span>
            </Link>
          ))}
        </div>
      ) : null}

      <Panel className="mb-4 p-3.5">
        <form className="grid gap-2 md:grid-cols-4">
          <input type="hidden" name="tab" value={tab} />
          <input type="hidden" name="view" value={view} />
          {sp.mine === "1" ? <input type="hidden" name="mine" value="1" /> : null}
          <Input name="q" defaultValue={sp.q} placeholder="Search any item…" />
          <Input name="customer" defaultValue={sp.customer} placeholder="Filter buyer…" />
          <Input name="vessel" defaultValue={sp.vessel} placeholder="Filter vessel…" />
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
        </form>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tss-table min-w-[960px]">
            <thead>
              <tr>
                <th>Received</th>
                <th>Number</th>
                <th>Buyer / C.Person</th>
                <th>Vessel</th>
                <th>Reference / category</th>
                <th>Status</th>
                <th>Owner</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap text-xs text-tss-slate">
                    {formatDate(e.receivedAt)}
                    {e.priority === "URGENT" ? (
                      <div className="mt-0.5 font-semibold tracking-wide text-tss-danger">
                        URGENT
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <Link
                      href={`/enquiries/${e.id}`}
                      className="font-semibold text-tss-steel hover:underline"
                    >
                      {e.number}
                    </Link>
                    <div className="mt-0.5 text-[11px] text-tss-slate">
                      {e._count.lines} lines · {e._count.rfqs} RFQs · {e._count.customerQuotes}{" "}
                      quotes
                    </div>
                  </td>
                  <td>
                    <div className="font-medium text-tss-ink">{e.customer.name}</div>
                    <div className="text-xs text-tss-slate">{e.customer.contact || "—"}</div>
                  </td>
                  <td className="font-medium">{e.vessel?.name || e.vesselName || "—"}</td>
                  <td>
                    <div className="text-tss-slate">{e.reference || "—"}</div>
                    <div className="text-xs text-tss-ink/80">
                      {e.category || e.subject || "SPARES"}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="text-tss-slate">{e.owner?.name || "—"}</td>
                  <td className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/enquiries/${e.id}`}>Open</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="!py-14 text-center text-tss-slate">
                    No items in this queue.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
