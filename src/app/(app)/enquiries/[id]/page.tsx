import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/documents";
import { PageHeader, Panel } from "@/components/ui/panel";
import { StatusBadge, PIPELINE_ORDER, statusLabel } from "@/lib/status";
import { formatDate, decimalToNumber, cn } from "@/lib/utils";
import { RfqPanel } from "@/components/enquiries/rfq-panel";
import { QuoteBuilder } from "@/components/enquiries/quote-builder";
import { OrdersPanel } from "@/components/enquiries/orders-panel";
import { EnquiryEditor } from "@/components/enquiries/enquiry-editor";
import { QuoteComparison } from "@/components/enquiries/quote-comparison";
import { TransactionMonitor } from "@/components/enquiries/transaction-monitor";
import { AttachmentsPanel } from "@/components/enquiries/attachments-panel";
import { ExportButton } from "@/components/ui/export-button";
import { buildTransactionMonitor } from "@/lib/transaction-monitor";

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [enquiry, suppliers, settings, customers, users, vessels] = await Promise.all([
    prisma.enquiry.findUnique({
      where: { id },
      include: {
        customer: true,
        owner: true,
        vessel: true,
        lines: { orderBy: { sortOrder: "asc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        events: { orderBy: { occurredAt: "desc" } },
        rfqs: {
          include: {
            supplier: true,
            quotes: {
              include: {
                lines: true,
                supplier: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        customerQuotes: { orderBy: { createdAt: "desc" } },
        purchaseOrders: true,
        supplierPurchases: { include: { supplier: true, lines: true } },
      },
    }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getCompanySettings(),
    prisma.customer.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.vessel.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!enquiry) notFound();

  const monitor = buildTransactionMonitor(enquiry);

  const supplierQuoteLines = enquiry.rfqs.flatMap((r) =>
    r.quotes.flatMap((q) =>
      q.lines.map((l) => ({
        id: l.id,
        enquiryLineId: l.enquiryLineId,
        partId: l.partId,
        partNumber: l.partNumber,
        description: l.description,
        quantity: decimalToNumber(l.quantity),
        unitCost: decimalToNumber(l.unitCost),
        currency: l.currency,
        leadTimeDays: l.leadTimeDays,
        notes: l.notes,
        supplierQuote: { supplier: { id: r.supplier.id, name: r.supplier.name } },
      }))
    )
  );

  const plainLines = enquiry.lines.map((l) => ({
    id: l.id,
    partId: l.partId,
    partNumber: l.partNumber,
    description: l.description,
    impaCode: l.impaCode,
    brand: l.brand,
    quantity: decimalToNumber(l.quantity),
    unit: l.unit,
    specs: l.specs,
    notes: l.notes,
    sortOrder: l.sortOrder,
  }));

  const supplierCostMap = enquiry.rfqs.map((r) => {
    const costs: Record<string, number> = {};
    for (const q of r.quotes) {
      for (const l of q.lines) {
        const existing = costs[l.enquiryLineId];
        const cost = decimalToNumber(l.unitCost);
        if (existing == null || cost < existing) costs[l.enquiryLineId] = cost;
      }
    }
    return { id: r.supplierId, name: r.supplier.name, costs };
  });

  const statusIndex = PIPELINE_ORDER.indexOf(enquiry.status);
  const canEditLines =
    enquiry.rfqs.length === 0 &&
    enquiry.customerQuotes.length === 0 &&
    enquiry.supplierPurchases.length === 0;

  return (
    <div>
      <PageHeader
        title={enquiry.number}
        description={`${enquiry.customer.name}${enquiry.vesselName ? ` · ${enquiry.vesselName}` : ""}${enquiry.deliveryPort ? ` · ${enquiry.deliveryPort}` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton entity="enquiry" query={{ id: enquiry.id }} label="Export Excel" />
            <StatusBadge status={enquiry.status} />
          </div>
        }
      />

      <Panel className="mb-6 overflow-x-auto p-4">
        <div className="flex min-w-[720px] items-center gap-1">
          {PIPELINE_ORDER.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-1">
              <div
                className={cn(
                  "h-2 flex-1 rounded-full",
                  i <= statusIndex ? "bg-tss-steel animate-progress" : "bg-tss-border"
                )}
                title={statusLabel(s)}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-tss-slate">
          Current: {statusLabel(enquiry.status)} · Updated {formatDate(enquiry.updatedAt)}
        </div>
      </Panel>

      <div className="mb-6">
        <TransactionMonitor
          enquiryId={enquiry.id}
          steps={monitor.steps}
          rfqRows={monitor.rfqRows}
          timeline={monitor.timeline}
          summary={monitor.summary}
        />
      </div>

      <div className="mb-6">
        <EnquiryEditor
          enquiry={{
            id: enquiry.id,
            customerId: enquiry.customerId,
            vesselId: enquiry.vesselId,
            ownerId: enquiry.ownerId,
            subject: enquiry.subject,
            vesselName: enquiry.vesselName,
            category: enquiry.category,
            priority: enquiry.priority,
            reference: enquiry.reference,
            deliveryPort: enquiry.deliveryPort,
            notes: enquiry.notes,
            dueDate: enquiry.dueDate,
            status: enquiry.status,
            lines: plainLines,
          }}
          customers={customers}
          users={users}
          vessels={vessels}
          canEditLines={canEditLines}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel className="p-4 text-sm lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-tss-navy">Snapshot</h3>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-tss-slate">Subject</dt>
              <dd>{enquiry.subject || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-tss-slate">Reference</dt>
              <dd>{enquiry.reference || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-tss-slate">Delivery port</dt>
              <dd>{enquiry.deliveryPort || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-tss-slate">Owner</dt>
              <dd>{enquiry.owner?.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-tss-slate">Received</dt>
              <dd>{formatDate(enquiry.receivedAt)}</dd>
            </div>
          </dl>
        </Panel>
        <Panel className="p-4 text-sm">
          <h3 className="mb-3 text-sm font-semibold text-tss-navy">Documents</h3>
          <ul className="space-y-2">
            {enquiry.customerQuotes.map((q) => (
              <li key={q.id}>
                <Link className="text-tss-steel hover:underline" href={`/quotes/${q.id}`}>
                  Quote {q.number}
                </Link>
                <span className="text-tss-slate"> · {q.status}</span>
              </li>
            ))}
            {enquiry.purchaseOrders.map((po) => (
              <li key={po.id} className="text-tss-slate">
                Customer PO {po.number}
                {po.customerPoRef ? ` (${po.customerPoRef})` : ""}
              </li>
            ))}
            {enquiry.supplierPurchases.map((p) => (
              <li key={p.id}>
                <a
                  className="text-tss-steel hover:underline"
                  href={`/api/pdf/purchase/${p.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Purchase {p.number}
                </a>
                <span className="text-tss-slate"> · {p.supplier.name}</span>
              </li>
            ))}
            {enquiry.rfqs.map((r) => (
              <li key={r.id}>
                <a
                  className="text-tss-steel hover:underline"
                  href={`/api/pdf/rfq/${r.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  RFQ {r.number}
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mb-6">
        <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
          Line items
        </div>
        <table className="w-full text-sm">
          <thead className="bg-tss-steel-soft/40 text-left text-xs uppercase text-tss-slate">
            <tr>
              <th className="px-4 py-2">Part #</th>
              <th className="px-4 py-2">IMPA</th>
              <th className="px-4 py-2">Brand</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Unit</th>
            </tr>
          </thead>
          <tbody>
            {enquiry.lines.map((l) => (
              <tr key={l.id} className="border-t border-tss-border/70">
                <td className="px-4 py-2 font-mono text-xs">{l.partNumber}</td>
                <td className="px-4 py-2 font-mono text-xs text-tss-slate">
                  {l.impaCode || "—"}
                </td>
                <td className="px-4 py-2 text-tss-slate">{l.brand || "—"}</td>
                <td className="px-4 py-2">{l.description}</td>
                <td className="px-4 py-2">{decimalToNumber(l.quantity)}</td>
                <td className="px-4 py-2">{l.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="mb-6">
        <AttachmentsPanel enquiryId={enquiry.id} attachments={enquiry.attachments} />
      </div>

      <div className="space-y-6">
        <RfqPanel
          enquiryId={enquiry.id}
          suppliers={suppliers}
          deliveryPort={enquiry.deliveryPort}
          category={enquiry.category}
          lines={plainLines}
          rfqs={enquiry.rfqs.map((r) => ({
            id: r.id,
            number: r.number,
            status: r.status,
            supplier: { id: r.supplier.id, name: r.supplier.name },
            quotes: r.quotes.map((q) => ({
              id: q.id,
              number: q.number,
              currency: q.currency,
              receivedAt: q.receivedAt,
              leadTimeDays: q.leadTimeDays,
              notes: q.notes,
              lines: q.lines.map((l) => ({
                id: l.id,
                enquiryLineId: l.enquiryLineId,
                partNumber: l.partNumber,
                description: l.description,
                quantity: decimalToNumber(l.quantity),
                unitCost: decimalToNumber(l.unitCost),
                currency: l.currency,
              })),
            })),
          }))}
        />

        {supplierQuoteLines.length > 0 ? (
          <>
            <QuoteComparison
              lines={plainLines}
              supplierQuoteLines={supplierQuoteLines}
            />
            <QuoteBuilder
              enquiryId={enquiry.id}
              lines={plainLines}
              supplierQuoteLines={supplierQuoteLines}
              defaultMargin={decimalToNumber(settings.defaultMarginPct)}
            />
          </>
        ) : null}

        <OrdersPanel
          enquiryId={enquiry.id}
          lines={plainLines}
          suppliers={supplierCostMap}
        />
      </div>
    </div>
  );
}
