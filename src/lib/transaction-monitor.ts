import { DocumentEventType } from "@prisma/client";
import { formatDateTime } from "@/lib/utils";

export type MonitorStepStatus = "done" | "active" | "waiting" | "overdue" | "skipped";

export type MonitorStep = {
  id: string;
  title: string;
  subtitle?: string;
  status: MonitorStepStatus;
  at?: Date | null;
  meta?: string;
};

export type MonitorEvent = {
  id: string;
  label: string;
  type: DocumentEventType | "SYSTEM";
  entityType: string;
  occurredAt: Date;
  notes?: string | null;
};

type EnquiryMonitorInput = {
  id: string;
  number: string;
  status: string;
  createdAt: Date;
  receivedAt: Date;
  dueDate: Date | null;
  customer: { name: string };
  rfqs: {
    id: string;
    number: string;
    status: string;
    sentAt: Date;
    openedAt: Date | null;
    respondedAt: Date | null;
    dueAt: Date | null;
    supplier: { name: string };
    quotes: { id: string; receivedAt: Date }[];
  }[];
  customerQuotes: {
    id: string;
    number: string;
    status: string;
    createdAt: Date;
    sentAt: Date | null;
  }[];
  purchaseOrders: { id: string; number: string; receivedAt: Date }[];
  supplierPurchases: {
    id: string;
    number: string;
    status: string;
    sentAt: Date | null;
    createdAt: Date;
    supplier: { name: string };
  }[];
  events: {
    id: string;
    label: string;
    type: DocumentEventType;
    entityType: string;
    notes: string | null;
    occurredAt: Date;
  }[];
};

function isOverdue(due: Date | null | undefined, completed: boolean) {
  if (!due || completed) return false;
  return due.getTime() < Date.now();
}

export function buildTransactionMonitor(enquiry: EnquiryMonitorInput) {
  const now = Date.now();
  const hasRfqs = enquiry.rfqs.length > 0;
  const hasSupplierQuotes = enquiry.rfqs.some((r) => r.quotes.length > 0);
  const hasCustomerQuote = enquiry.customerQuotes.length > 0;
  const quoteSent = enquiry.customerQuotes.some((q) => q.sentAt || q.status === "SENT");
  const quoteApproved = enquiry.customerQuotes.some((q) => q.status === "APPROVED");
  const hasPo = enquiry.purchaseOrders.length > 0;
  const hasPurchase = enquiry.supplierPurchases.length > 0;
  const purchaseSent = enquiry.supplierPurchases.some((p) => p.sentAt || p.status === "SENT");

  const steps: MonitorStep[] = [
    {
      id: "enquiry",
      title: "Enquiry received",
      subtitle: enquiry.customer.name,
      status: "done",
      at: enquiry.receivedAt,
      meta: enquiry.number,
    },
    {
      id: "rfq",
      title: "RFQs to suppliers",
      subtitle: hasRfqs
        ? `${enquiry.rfqs.length} supplier${enquiry.rfqs.length === 1 ? "" : "s"}`
        : "Not sent yet",
      status: hasRfqs ? "done" : "waiting",
      at: hasRfqs ? enquiry.rfqs[0]?.sentAt : null,
    },
    {
      id: "supplier-quotes",
      title: "Supplier quotes",
      subtitle: hasSupplierQuotes
        ? `${enquiry.rfqs.filter((r) => r.quotes.length).length}/${enquiry.rfqs.length} responded`
        : hasRfqs
          ? "Awaiting responses"
          : undefined,
      status: hasSupplierQuotes
        ? "done"
        : hasRfqs
          ? enquiry.rfqs.some((r) => isOverdue(r.dueAt, r.quotes.length > 0))
            ? "overdue"
            : "active"
          : "waiting",
      at: hasSupplierQuotes
        ? enquiry.rfqs.flatMap((r) => r.quotes.map((q) => q.receivedAt)).sort((a, b) => a.getTime() - b.getTime())[0]
        : null,
    },
    {
      id: "customer-quote",
      title: "Customer quote",
      subtitle: hasCustomerQuote
        ? quoteSent
          ? "Sent to customer"
          : "Draft ready"
        : undefined,
      status: quoteSent ? "done" : hasCustomerQuote ? "active" : hasSupplierQuotes ? "waiting" : "waiting",
      at: enquiry.customerQuotes[0]?.sentAt || enquiry.customerQuotes[0]?.createdAt || null,
      meta: enquiry.customerQuotes[0]?.number,
    },
    {
      id: "approval",
      title: "Customer decision",
      subtitle: quoteApproved
        ? "Approved"
        : enquiry.customerQuotes.some((q) => q.status === "REJECTED")
          ? "Rejected"
          : quoteSent
            ? "Awaiting approval"
            : undefined,
      status: quoteApproved
        ? "done"
        : enquiry.customerQuotes.some((q) => q.status === "REJECTED")
          ? "skipped"
          : quoteSent
            ? "active"
            : "waiting",
      at: quoteApproved || enquiry.customerQuotes.some((q) => q.status === "REJECTED")
        ? enquiry.customerQuotes[0]?.sentAt
        : null,
    },
    {
      id: "customer-po",
      title: "Customer PO",
      subtitle: hasPo ? enquiry.purchaseOrders[0]?.number : undefined,
      status: hasPo ? "done" : quoteApproved ? "active" : "waiting",
      at: enquiry.purchaseOrders[0]?.receivedAt || null,
    },
    {
      id: "supplier-po",
      title: "Supplier purchase",
      subtitle: hasPurchase
        ? purchaseSent
          ? "Sent to supplier"
          : "Draft"
        : undefined,
      status: purchaseSent ? "done" : hasPurchase ? "active" : hasPo ? "waiting" : "waiting",
      at: enquiry.supplierPurchases[0]?.sentAt || enquiry.supplierPurchases[0]?.createdAt || null,
      meta: enquiry.supplierPurchases[0]?.number,
    },
  ];

  if (enquiry.status === "COMPLETED") {
    steps.push({
      id: "complete",
      title: "Completed",
      status: "done",
      at: enquiry.createdAt,
    });
  }

  const rfqRows = enquiry.rfqs.map((r) => {
    const quoted = r.quotes.length > 0 || r.status === "QUOTED";
    const overdue = isOverdue(r.dueAt, quoted);
    return {
      id: r.id,
      number: r.number,
      supplier: r.supplier.name,
      status: quoted ? "RESPONDED" : r.openedAt ? "OPENED" : r.status,
      sentAt: r.sentAt,
      openedAt: r.openedAt,
      respondedAt: r.respondedAt || (quoted ? r.quotes[0]?.receivedAt : null),
      dueAt: r.dueAt,
      overdue,
    };
  });

  const timeline: MonitorEvent[] = (
    [
      {
        id: `enq-${enquiry.id}`,
        label: `Enquiry ${enquiry.number} received from ${enquiry.customer.name}`,
        type: "SYSTEM" as const,
        entityType: "Enquiry",
        occurredAt: enquiry.receivedAt,
      },
      ...enquiry.rfqs.map((r) => ({
        id: `rfq-${r.id}`,
        label: `RFQ ${r.number} sent to ${r.supplier.name}`,
        type: "SYSTEM" as const,
        entityType: "SupplierRfq",
        occurredAt: r.sentAt,
      })),
      ...enquiry.rfqs.flatMap((r) =>
        r.openedAt
          ? [
              {
                id: `rfq-open-${r.id}`,
                label: `${r.supplier.name} opened RFQ ${r.number}`,
                type: "SYSTEM" as const,
                entityType: "SupplierRfq",
                occurredAt: r.openedAt,
              },
            ]
          : []
      ),
      ...enquiry.rfqs.flatMap((r) =>
        r.quotes.map((q) => ({
          id: `sq-${q.id}`,
          label: `Supplier quote received from ${r.supplier.name}`,
          type: "SYSTEM" as const,
          entityType: "SupplierQuote",
          occurredAt: q.receivedAt,
        }))
      ),
      ...enquiry.customerQuotes.map((q) => ({
        id: `cq-${q.id}`,
        label: q.sentAt
          ? `Customer quote ${q.number} sent`
          : `Customer quote ${q.number} created`,
        type: "SYSTEM" as const,
        entityType: "CustomerQuote",
        occurredAt: q.sentAt || q.createdAt,
      })),
      ...enquiry.purchaseOrders.map((po) => ({
        id: `po-${po.id}`,
        label: `Customer PO ${po.number} recorded`,
        type: "SYSTEM" as const,
        entityType: "PurchaseOrder",
        occurredAt: po.receivedAt,
      })),
      ...enquiry.supplierPurchases.map((p) => ({
        id: `sp-${p.id}`,
        label: p.sentAt
          ? `Purchase ${p.number} sent to ${p.supplier.name}`
          : `Purchase ${p.number} drafted for ${p.supplier.name}`,
        type: "SYSTEM" as const,
        entityType: "SupplierPurchase",
        occurredAt: p.sentAt || p.createdAt,
      })),
      ...enquiry.events.map((e) => ({
        id: e.id,
        label: e.label,
        type: e.type,
        entityType: e.entityType,
        occurredAt: e.occurredAt,
        notes: e.notes,
      })),
    ] as MonitorEvent[]
  ).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  const openCount = rfqRows.filter((r) => !r.respondedAt).length;
  const overdueCount = rfqRows.filter((r) => r.overdue).length;

  return {
    steps,
    rfqRows,
    timeline,
    summary: {
      openCount,
      overdueCount,
      dueLabel: enquiry.dueDate ? formatDateTime(enquiry.dueDate) : null,
      isEnquiryOverdue: isOverdue(enquiry.dueDate, ["COMPLETED", "CANCELLED", "REJECTED"].includes(enquiry.status)),
      now,
    },
  };
}
