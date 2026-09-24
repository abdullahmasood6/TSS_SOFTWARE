"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PIPELINE_ORDER, statusLabel } from "@/lib/status";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import type { EnquiryStatus } from "@prisma/client";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "lines", label: "Lines" },
  { id: "rfq", label: "RFQ & costs" },
  { id: "quote", label: "Customer quote" },
  { id: "orders", label: "Orders" },
  { id: "files", label: "Files" },
  { id: "timeline", label: "Timeline" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type DocLink = {
  kind: "quote" | "po" | "purchase" | "rfq";
  id: string;
  label: string;
  meta?: string;
  href: string;
};

export function EnquiryWorkspace({
  status,
  updatedAt,
  receivedAt,
  dueDate,
  priority,
  subject,
  reference,
  deliveryPort,
  category,
  ownerName,
  customerName,
  vesselName,
  customerHref,
  lineCount,
  rfqCount,
  quoteCount,
  quotedLineCount,
  bestCostTotal,
  currency,
  docs,
  overviewExtras,
  editor,
  linesTable,
  attachments,
  rfqPanel,
  quoteComparison,
  quoteBuilder,
  ordersPanel,
  monitor,
}: {
  status: EnquiryStatus;
  updatedAt: Date | string;
  receivedAt: Date | string;
  dueDate: Date | string | null;
  priority: string;
  subject: string | null;
  reference: string | null;
  deliveryPort: string | null;
  category: string | null;
  ownerName: string | null;
  customerName: string;
  vesselName: string | null;
  customerHref: string;
  lineCount: number;
  rfqCount: number;
  quoteCount: number;
  quotedLineCount: number;
  bestCostTotal: number | null;
  currency: string;
  docs: DocLink[];
  overviewExtras?: React.ReactNode;
  editor: React.ReactNode;
  linesTable: React.ReactNode;
  attachments: React.ReactNode;
  rfqPanel: React.ReactNode;
  quoteComparison: React.ReactNode;
  quoteBuilder: React.ReactNode;
  ordersPanel: React.ReactNode;
  monitor: React.ReactNode;
}) {
  const statusIndex = PIPELINE_ORDER.indexOf(status);
  const overdue =
    dueDate &&
    !["COMPLETED", "CANCELLED", "REJECTED"].includes(status) &&
    new Date(dueDate).getTime() < Date.now();

  const defaultTab: TabId =
    status === "DRAFT" || status === "ENQUIRY_RECEIVED"
      ? "overview"
      : status === "RFQ_SENT" || status === "SUPPLIER_QUOTES_RECEIVED"
        ? "rfq"
        : status === "CUSTOMER_QUOTE_SENT" ||
            status === "AWAITING_APPROVAL" ||
            status === "APPROVED"
          ? "quote"
          : status === "PO_RECEIVED" || status === "PURCHASE_SENT"
            ? "orders"
            : "overview";

  const [tab, setTab] = useState<TabId>(defaultTab);

  const coverage = useMemo(() => {
    if (!lineCount) return 0;
    return Math.round((quotedLineCount / lineCount) * 100);
  }, [lineCount, quotedLineCount]);

  const stageGroups = [
    { label: "Intake", statuses: ["DRAFT", "ENQUIRY_RECEIVED"] },
    { label: "Sourcing", statuses: ["RFQ_SENT", "SUPPLIER_QUOTES_RECEIVED"] },
    { label: "Sell", statuses: ["CUSTOMER_QUOTE_SENT", "AWAITING_APPROVAL", "APPROVED"] },
    { label: "Fulfill", statuses: ["PO_RECEIVED", "PURCHASE_SENT", "COMPLETED"] },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Labeled pipeline */}
      <Panel className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tss-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <Badge tone={priority === "URGENT" || priority === "HIGH" ? "danger" : "neutral"}>
              {priority || "NORMAL"}
            </Badge>
            {overdue ? <Badge tone="danger">Overdue</Badge> : null}
            {category ? <Badge tone="info">{category}</Badge> : null}
          </div>
          <div className="text-xs text-tss-slate">
            Updated {formatDate(updatedAt)}
            {dueDate ? ` · Due ${formatDate(dueDate)}` : ""}
          </div>
        </div>
        <div className="overflow-x-auto px-4 py-4">
          <div className="flex min-w-[760px] gap-2">
            {stageGroups.map((group) => {
              const indices = group.statuses
                .map((s) => PIPELINE_ORDER.indexOf(s as EnquiryStatus))
                .filter((i) => i >= 0);
              const groupActive = indices.includes(statusIndex);
              const groupDone = indices.every((i) => i < statusIndex) && indices.length > 0;
              return (
                <div
                  key={group.label}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2.5 transition",
                    groupActive
                      ? "border-tss-steel/40 bg-tss-steel-soft/70 shadow-[0_0_0_1px_rgba(31,111,235,0.08)]"
                      : groupDone
                        ? "border-emerald-200/80 bg-emerald-50/50"
                        : "border-tss-border bg-white"
                  )}
                >
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-tss-slate">
                    {group.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.statuses.map((s) => {
                      const i = PIPELINE_ORDER.indexOf(s as EnquiryStatus);
                      const done = i >= 0 && i < statusIndex;
                      const current = i === statusIndex;
                      return (
                        <span
                          key={s}
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[11px] font-medium",
                            current
                              ? "bg-tss-navy text-white"
                              : done
                                ? "bg-emerald-100/80 text-tss-success"
                                : "bg-tss-surface text-tss-slate"
                          )}
                          title={statusLabel(s as EnquiryStatus)}
                        >
                          {statusLabel(s as EnquiryStatus)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Sticky stage tabs */}
      <div className="sticky top-[3.25rem] z-10 -mx-1 border-b border-tss-border/80 bg-[rgba(243,246,250,0.92)] px-1 py-2 backdrop-blur-md">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.id;
            const count =
              t.id === "lines"
                ? lineCount
                : t.id === "rfq"
                  ? rfqCount
                  : t.id === "quote"
                    ? quoteCount
                    : t.id === "files"
                      ? docs.filter((d) => d.kind === "rfq").length
                      : null;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative shrink-0 rounded-md px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-white text-tss-navy shadow-[0_1px_0_rgba(10,28,54,0.06)] ring-1 ring-tss-border"
                    : "text-tss-slate hover:bg-white/70 hover:text-tss-navy"
                )}
              >
                {t.label}
                {count != null ? (
                  <span
                    className={cn(
                      "ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                      active ? "bg-tss-steel-soft text-tss-navy" : "bg-tss-mist text-tss-slate"
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "overview" ? (
        <div className="space-y-5 animate-fade-up">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Line items", value: String(lineCount), hint: "Requested parts" },
              {
                label: "Supplier RFQs",
                value: String(rfqCount),
                hint: quotedLineCount
                  ? `${coverage}% lines with a cost`
                  : "Awaiting supplier costs",
              },
              {
                label: "Best cost total",
                value:
                  bestCostTotal != null ? formatMoney(bestCostTotal, currency) : "—",
                hint: "Lowest supplier cost per line",
              },
              {
                label: "Customer quotes",
                value: String(quoteCount),
                hint: quoteCount ? "Open quotes list for status" : "Build after costs land",
              },
            ].map((k) => (
              <Panel key={k.label} className="tss-kpi p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-tss-slate">
                  {k.label}
                </div>
                <div className="mt-1 text-xl font-semibold tracking-tight text-tss-navy">
                  {k.value}
                </div>
                <div className="mt-1 text-xs text-tss-slate">{k.hint}</div>
              </Panel>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="p-4 text-sm lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold text-tss-navy">Enquiry summary</h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
                    Customer
                  </dt>
                  <dd>
                    <Link href={customerHref} className="font-medium text-tss-steel hover:underline">
                      {customerName}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
                    Vessel
                  </dt>
                  <dd>{vesselName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
                    Subject
                  </dt>
                  <dd>{subject || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
                    Reference
                  </dt>
                  <dd>{reference || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
                    Delivery port
                  </dt>
                  <dd>{deliveryPort || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
                    Owner
                  </dt>
                  <dd>{ownerName || "Unassigned"}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
                    Received
                  </dt>
                  <dd>{formatDate(receivedAt)}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
                    Due
                  </dt>
                  <dd className={overdue ? "font-medium text-tss-danger" : undefined}>
                    {dueDate ? formatDate(dueDate) : "—"}
                  </dd>
                </div>
              </dl>
              {overviewExtras}
            </Panel>

            <Panel className="p-4 text-sm">
              <h3 className="mb-3 text-sm font-semibold text-tss-navy">Linked documents</h3>
              {docs.length === 0 ? (
                <p className="text-tss-slate">No documents yet — start with RFQs.</p>
              ) : (
                <ul className="space-y-2.5">
                  {docs.map((d) => (
                    <li key={`${d.kind}-${d.id}`} className="flex items-start justify-between gap-2">
                      <div>
                        {d.href.startsWith("/api/") ? (
                          <a
                            href={d.href}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-tss-steel hover:underline"
                          >
                            {d.label}
                          </a>
                        ) : (
                          <Link href={d.href} className="font-medium text-tss-steel hover:underline">
                            {d.label}
                          </Link>
                        )}
                        {d.meta ? (
                          <div className="text-xs text-tss-slate">{d.meta}</div>
                        ) : null}
                      </div>
                      <Badge tone="neutral">{d.kind}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-tss-border pt-3">
                <button
                  type="button"
                  className="rounded-md border border-tss-border bg-white px-2.5 py-1.5 text-xs font-semibold text-tss-navy hover:bg-tss-steel-soft/60"
                  onClick={() => setTab("rfq")}
                >
                  Go to RFQ
                </button>
                <button
                  type="button"
                  className="rounded-md border border-tss-border bg-white px-2.5 py-1.5 text-xs font-semibold text-tss-navy hover:bg-tss-steel-soft/60"
                  onClick={() => setTab("quote")}
                >
                  Go to quote
                </button>
                <button
                  type="button"
                  className="rounded-md border border-tss-border bg-white px-2.5 py-1.5 text-xs font-semibold text-tss-navy hover:bg-tss-steel-soft/60"
                  onClick={() => setTab("orders")}
                >
                  Go to orders
                </button>
              </div>
            </Panel>
          </div>

          {editor}
        </div>
      ) : null}

      {tab === "lines" ? (
        <div className="space-y-4 animate-fade-up">
          <Panel className="p-4">
            <h3 className="text-sm font-semibold text-tss-navy">Line items</h3>
            <p className="mt-1 text-xs text-tss-slate">
              IMPA / brand coded parts. Edit lines from Overview while no RFQs or quotes exist.
            </p>
          </Panel>
          {linesTable}
          {editor}
        </div>
      ) : null}

      {tab === "rfq" ? (
        <div className="space-y-4 animate-fade-up">
          <Panel className="p-4">
            <h3 className="text-sm font-semibold text-tss-navy">Supplier RFQs & cost entry</h3>
            <p className="mt-1 text-xs text-tss-slate">
              Recommended suppliers are ranked by port, category, KYC, lead time, and brand fit.
              Log unit costs as quotes arrive, then compare.
            </p>
          </Panel>
          {rfqPanel}
          {quoteComparison}
        </div>
      ) : null}

      {tab === "quote" ? (
        <div className="space-y-4 animate-fade-up">
          <Panel className="p-4">
            <h3 className="text-sm font-semibold text-tss-navy">Customer quote</h3>
            <p className="mt-1 text-xs text-tss-slate">
              Pick best costs, apply margin, and watch under-quote warnings against price history.
            </p>
          </Panel>
          {quoteComparison}
          {quoteBuilder}
          {quoteCount > 0 ? (
            <Panel className="p-4 text-sm">
              <div className="font-medium text-tss-navy">Open existing quotes</div>
              <ul className="mt-2 space-y-1">
                {docs
                  .filter((d) => d.kind === "quote")
                  .map((d) => (
                    <li key={d.id}>
                      <Link href={d.href} className="text-tss-steel hover:underline">
                        {d.label}
                      </Link>
                      {d.meta ? <span className="text-tss-slate"> · {d.meta}</span> : null}
                    </li>
                  ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      ) : null}

      {tab === "orders" ? (
        <div className="space-y-4 animate-fade-up">
          <Panel className="p-4">
            <h3 className="text-sm font-semibold text-tss-navy">Customer PO & supplier purchase</h3>
            <p className="mt-1 text-xs text-tss-slate">
              Record the customer PO, then raise supplier purchases. Track shipment from Orders /
              Invoices afterward.
            </p>
          </Panel>
          {ordersPanel}
        </div>
      ) : null}

      {tab === "files" ? (
        <div className="space-y-4 animate-fade-up">
          <Panel className="p-4">
            <h3 className="text-sm font-semibold text-tss-navy">Attachments</h3>
            <p className="mt-1 text-xs text-tss-slate">
              Specs, drawings, and customer emails linked to this enquiry.
            </p>
          </Panel>
          {attachments}
        </div>
      ) : null}

      {tab === "timeline" ? (
        <div className="space-y-4 animate-fade-up">
          <Panel className="p-4">
            <h3 className="text-sm font-semibold text-tss-navy">Transaction monitor</h3>
            <p className="mt-1 text-xs text-tss-slate">
              Document events, RFQ acknowledgements, and overdue signals for this enquiry.
            </p>
          </Panel>
          {monitor}
        </div>
      ) : null}
    </div>
  );
}

/** Helper used by server page for cost totals without importing Decimal in client. */
export function sumBestCosts(
  lines: { id: string; quantity: number }[],
  supplierQuoteLines: { enquiryLineId: string; unitCost: number }[]
) {
  let total = 0;
  let covered = 0;
  for (const line of lines) {
    const costs = supplierQuoteLines
      .filter((q) => q.enquiryLineId === line.id)
      .map((q) => q.unitCost);
    if (!costs.length) continue;
    covered += 1;
    total += Math.min(...costs) * line.quantity;
  }
  return { total: covered ? total : null, covered };
}
