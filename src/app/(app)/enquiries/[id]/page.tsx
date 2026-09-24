import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/documents";
import { PageHeader, Panel } from "@/components/ui/panel";
import { formatDate, decimalToNumber } from "@/lib/utils";
import { RfqPanel } from "@/components/enquiries/rfq-panel";
import { QuoteBuilder } from "@/components/enquiries/quote-builder";
import { OrdersPanel } from "@/components/enquiries/orders-panel";
import { EnquiryEditor } from "@/components/enquiries/enquiry-editor";
import { QuoteComparison } from "@/components/enquiries/quote-comparison";
import { TransactionMonitor } from "@/components/enquiries/transaction-monitor";
import { AttachmentsPanel } from "@/components/enquiries/attachments-panel";
import {
  EnquiryWorkspace,
  sumBestCosts,
} from "@/components/enquiries/enquiry-workspace";
import { ExportButton } from "@/components/ui/export-button";
import { StatusBadge } from "@/lib/status";
import { buildTransactionMonitor } from "@/lib/transaction-monitor";
import { Button } from "@/components/ui/button";
import { requirePermission, can } from "@/lib/permissions";

export default async function EnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("enquiries.view");
  const role = session.user.role;
  const canEditEnquiry = can(role, "enquiries.write");
  const canRfq = can(role, "rfq.write");
  const canQuote = can(role, "quotes.write");
  const canCreatePo = can(role, "orders.customer_po");
  const canCreatePurchase = can(role, "orders.purchase");

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

  const canEditLines =
    enquiry.rfqs.length === 0 &&
    enquiry.customerQuotes.length === 0 &&
    enquiry.supplierPurchases.length === 0;

  const { total: bestCostTotal, covered: quotedLineCount } = sumBestCosts(
    plainLines.map((l) => ({ id: l.id, quantity: l.quantity })),
    supplierQuoteLines.map((l) => ({
      enquiryLineId: l.enquiryLineId,
      unitCost: l.unitCost,
    }))
  );

  const docs = [
    ...enquiry.customerQuotes.map((q) => ({
      kind: "quote" as const,
      id: q.id,
      label: `Quote ${q.number}`,
      meta: q.status,
      href: `/quotes/${q.id}`,
    })),
    ...enquiry.purchaseOrders.map((po) => ({
      kind: "po" as const,
      id: po.id,
      label: `Customer PO ${po.number}`,
      meta: po.customerPoRef || undefined,
      href: `/orders`,
    })),
    ...enquiry.supplierPurchases.map((p) => ({
      kind: "purchase" as const,
      id: p.id,
      label: `Purchase ${p.number}`,
      meta: `${p.supplier.name} · ${p.status}`,
      href: `/api/pdf/purchase/${p.id}`,
    })),
    ...enquiry.rfqs.map((r) => ({
      kind: "rfq" as const,
      id: r.id,
      label: `RFQ ${r.number}`,
      meta: r.supplier.name,
      href: `/api/pdf/rfq/${r.id}`,
    })),
  ];

  const editor = (
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
      canEditLines={canEditLines && canEditEnquiry}
      canEdit={canEditEnquiry}
    />
  );

  const linesTable = (
    <Panel>
      <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
        {enquiry.lines.length} line{enquiry.lines.length === 1 ? "" : "s"}
      </div>
      <table className="tss-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Part</th>
            <th>IMPA</th>
            <th>Brand</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Specs</th>
          </tr>
        </thead>
        <tbody>
          {enquiry.lines.map((l, idx) => (
            <tr key={l.id}>
              <td className="text-tss-slate">{idx + 1}</td>
              <td className="font-mono text-xs font-medium">{l.partNumber}</td>
              <td className="font-mono text-xs text-tss-slate">{l.impaCode || "—"}</td>
              <td className="text-tss-slate">{l.brand || "—"}</td>
              <td>
                <div>{l.description}</div>
                {l.notes ? (
                  <div className="mt-0.5 text-xs text-tss-slate">{l.notes}</div>
                ) : null}
              </td>
              <td>{decimalToNumber(l.quantity)}</td>
              <td>{l.unit}</td>
              <td className="max-w-[12rem] truncate text-xs text-tss-slate">
                {l.specs || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );

  return (
    <div>
      <PageHeader
        title={enquiry.number}
        description={
          <>
            <Link href={`/customers/${enquiry.customerId}`} className="hover:underline">
              {enquiry.customer.name}
            </Link>
            {enquiry.vesselName || enquiry.vessel?.name
              ? ` · ${enquiry.vesselName || enquiry.vessel?.name}`
              : ""}
            {enquiry.deliveryPort ? ` · ${enquiry.deliveryPort}` : ""}
            {" · "}
            Received {formatDate(enquiry.receivedAt)}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/enquiries">All enquiries</Link>
            </Button>
            <ExportButton entity="enquiry" query={{ id: enquiry.id }} label="Export Excel" />
            <StatusBadge status={enquiry.status} />
          </div>
        }
      />

      <EnquiryWorkspace
        status={enquiry.status}
        updatedAt={enquiry.updatedAt}
        receivedAt={enquiry.receivedAt}
        dueDate={enquiry.dueDate}
        priority={enquiry.priority}
        subject={enquiry.subject}
        reference={enquiry.reference}
        deliveryPort={enquiry.deliveryPort}
        category={enquiry.category}
        ownerName={enquiry.owner?.name || null}
        customerName={enquiry.customer.name}
        vesselName={enquiry.vesselName || enquiry.vessel?.name || null}
        customerHref={`/customers/${enquiry.customerId}`}
        lineCount={enquiry.lines.length}
        rfqCount={enquiry.rfqs.length}
        quoteCount={enquiry.customerQuotes.length}
        quotedLineCount={quotedLineCount}
        bestCostTotal={bestCostTotal}
        currency={settings.defaultCurrency}
        docs={docs}
        editor={editor}
        linesTable={linesTable}
        attachments={
          <AttachmentsPanel
            enquiryId={enquiry.id}
            attachments={enquiry.attachments}
            canEdit={canEditEnquiry}
          />
        }
        rfqPanel={
          <RfqPanel
            enquiryId={enquiry.id}
            suppliers={suppliers}
            deliveryPort={enquiry.deliveryPort}
            category={enquiry.category}
            lines={plainLines}
            canEdit={canRfq}
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
        }
        quoteComparison={
          supplierQuoteLines.length > 0 ? (
            <QuoteComparison lines={plainLines} supplierQuoteLines={supplierQuoteLines} />
          ) : (
            <Panel className="p-6 text-sm text-tss-slate">
              No supplier costs yet. Send RFQs and log prices on the RFQ tab first.
            </Panel>
          )
        }
        quoteBuilder={
          supplierQuoteLines.length > 0 ? (
            <QuoteBuilder
              enquiryId={enquiry.id}
              lines={plainLines}
              supplierQuoteLines={supplierQuoteLines}
              defaultMargin={decimalToNumber(settings.defaultMarginPct)}
              canEdit={canQuote}
            />
          ) : null
        }
        ordersPanel={
          <OrdersPanel
            enquiryId={enquiry.id}
            lines={plainLines}
            suppliers={supplierCostMap}
            canCreatePo={canCreatePo}
            canCreatePurchase={canCreatePurchase}
          />
        }
        monitor={
          <TransactionMonitor
            enquiryId={enquiry.id}
            steps={monitor.steps}
            rfqRows={monitor.rfqRows}
            timeline={monitor.timeline}
            summary={monitor.summary}
          />
        }
      />
    </div>
  );
}
