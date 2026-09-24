import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, decimalToNumber } from "@/lib/utils";
import { markQuoteSent, setQuoteApproval } from "@/app/actions/workflow";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import { ExportButton } from "@/components/ui/export-button";
import { requirePermission, can } from "@/lib/permissions";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("quotes.view");
  const canEditQuote = can(session.user.role, "quotes.write");
  const canApprove = can(session.user.role, "quotes.approve");
  const { id } = await params;
  const quote = await prisma.customerQuote.findUnique({
    where: { id },
    include: {
      customer: true,
      enquiry: true,
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!quote) notFound();

  const total = quote.lines.reduce(
    (sum, l) => sum + decimalToNumber(l.quantity) * decimalToNumber(l.unitSell),
    0
  );

  async function sendAction() {
    "use server";
    await markQuoteSent(id);
  }
  async function approveAction() {
    "use server";
    await setQuoteApproval(id, true);
  }
  async function rejectAction() {
    "use server";
    await setQuoteApproval(id, false);
  }

  return (
    <div>
      <PageHeader
        title={quote.number}
        description={`${quote.customer.name} · Enquiry ${quote.enquiry.number}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportButton entity="quotes" query={{ q: quote.number }} label="Export Excel" />
            <Button asChild variant="outline">
              <a href={`/api/pdf/quote/${quote.id}`} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            </Button>
            <Badge tone="info">{quote.status}</Badge>
          </div>
        }
      />

      <QuoteEditor
        quoteId={quote.id}
        status={quote.status}
        notes={quote.notes}
        marginPct={decimalToNumber(quote.marginPct)}
        lines={quote.lines}
        canEdit={canEditQuote}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {canEditQuote && quote.status === "DRAFT" ? (
          <form action={sendAction}>
            <Button type="submit">Mark sent to customer</Button>
          </form>
        ) : null}
        {canApprove && (quote.status === "SENT" || quote.status === "DRAFT") ? (
          <>
            <form action={approveAction}>
              <Button type="submit" variant="steel">
                Mark approved
              </Button>
            </form>
            <form action={rejectAction}>
              <Button type="submit" variant="danger">
                Mark rejected
              </Button>
            </form>
          </>
        ) : null}
        <Button asChild variant="ghost">
          <Link href={`/enquiries/${quote.enquiryId}`}>Open enquiry</Link>
        </Button>
      </div>

      <Panel className="mb-4 p-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase text-tss-slate">Created</div>
            <div>{formatDate(quote.createdAt)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-tss-slate">Margin</div>
            <div>{decimalToNumber(quote.marginPct)}%</div>
          </div>
          <div>
            <div className="text-xs uppercase text-tss-slate">Total</div>
            <div className="text-lg font-semibold text-tss-navy">
              {formatMoney(total, quote.currency)}
            </div>
          </div>
        </div>
        {quote.underquoteNote ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-tss-warning">
            Under-quote note: {quote.underquoteNote}
          </p>
        ) : null}
      </Panel>

      <Panel>
        <table className="w-full text-sm">
          <thead className="bg-tss-steel-soft/50 text-left text-xs uppercase text-tss-slate">
            <tr>
              <th className="px-4 py-2">Part #</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Cost</th>
              <th className="px-4 py-2">Sell</th>
              <th className="px-4 py-2">Prior sell</th>
              <th className="px-4 py-2">Line total</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((l) => {
              const qty = decimalToNumber(l.quantity);
              const sell = decimalToNumber(l.unitSell);
              return (
                <tr key={l.id} className="border-t border-tss-border/70">
                  <td className="px-4 py-2 font-mono text-xs">{l.partNumber}</td>
                  <td className="px-4 py-2">{l.description}</td>
                  <td className="px-4 py-2">{qty}</td>
                  <td className="px-4 py-2">{formatMoney(decimalToNumber(l.unitCost), l.currency)}</td>
                  <td className="px-4 py-2 font-medium">
                    {formatMoney(sell, l.currency)}
                  </td>
                  <td className="px-4 py-2 text-tss-slate">
                    {l.previousSellPrice != null
                      ? formatMoney(decimalToNumber(l.previousSellPrice), l.currency)
                      : "—"}
                    {l.underquoteReason ? (
                      <div className="text-xs text-tss-danger">{l.underquoteReason}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">{formatMoney(qty * sell, l.currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
