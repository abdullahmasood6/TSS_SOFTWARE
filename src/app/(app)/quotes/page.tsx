import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Panel, EmptyState } from "@/components/ui/panel";
import { formatDate, formatMoney, decimalToNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/ui/export-button";
import { SearchBar } from "@/components/ui/search-bar";

const STATUSES = ["ALL", "DRAFT", "SENT", "APPROVED", "REJECTED"] as const;

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const quotes = await prisma.customerQuote.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
              { enquiry: { number: { contains: q, mode: "insensitive" } } },
              { enquiry: { vesselName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      enquiry: true,
      lines: true,
    },
  });

  function hrefFor(s: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (s !== "ALL") params.set("status", s);
    const str = params.toString();
    return str ? `/quotes?${str}` : "/quotes";
  }

  return (
    <div>
      <PageHeader
        title="Customer quotes"
        description="Filter by status, open drafts, and export to Excel."
        actions={<ExportButton entity="quotes" query={{ q }} />}
      />
      <div className="mb-4 space-y-3">
        <SearchBar defaultValue={q} placeholder="Search quote #, customer, enquiry, vessel…" />
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => {
            const active = (status || "ALL") === s;
            return (
              <Link
                key={s}
                href={hrefFor(s)}
                className={`rounded px-2 py-1 text-[11px] font-semibold ${
                  active
                    ? "bg-tss-navy text-white"
                    : "border border-tss-border bg-white text-tss-slate hover:bg-tss-steel-soft"
                }`}
              >
                {s === "ALL" ? "All" : s}
              </Link>
            );
          })}
        </div>
      </div>
      <Panel>
        {quotes.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            description="Build a quote from an enquiry after supplier prices are logged."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-tss-steel-soft/50 text-left text-xs uppercase tracking-wide text-tss-slate">
              <tr>
                <th className="px-4 py-2">Quote</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Enquiry / vessel</th>
                <th className="px-4 py-2">Margin</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((qrow) => {
                const total = qrow.lines.reduce(
                  (sum, l) =>
                    sum + decimalToNumber(l.quantity) * decimalToNumber(l.unitSell),
                  0
                );
                const cost = qrow.lines.reduce(
                  (sum, l) =>
                    sum + decimalToNumber(l.quantity) * decimalToNumber(l.unitCost),
                  0
                );
                const marginPct = total > 0 ? ((total - cost) / total) * 100 : 0;
                return (
                  <tr key={qrow.id} className="border-t border-tss-border/70">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/quotes/${qrow.id}`}
                        className="font-medium text-tss-steel hover:underline"
                      >
                        {qrow.number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/customers/${qrow.customerId}`}
                        className="hover:underline"
                      >
                        {qrow.customer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/enquiries/${qrow.enquiryId}`} className="hover:underline">
                        {qrow.enquiry.number}
                      </Link>
                      <div className="text-xs text-tss-slate">
                        {qrow.enquiry.vesselName || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{marginPct.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 font-medium">
                      {formatMoney(total, qrow.currency)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        tone={
                          qrow.status === "APPROVED"
                            ? "success"
                            : qrow.status === "REJECTED"
                              ? "danger"
                              : qrow.status === "SENT"
                                ? "warning"
                                : "info"
                        }
                      >
                        {qrow.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-tss-slate">
                      {formatDate(qrow.sentAt || qrow.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
