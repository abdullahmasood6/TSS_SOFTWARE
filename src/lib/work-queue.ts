import { prisma } from "@/lib/db";
import { EnquiryStatus } from "@prisma/client";

export type WorkQueueTab =
  | "needs-rfq"
  | "awaiting-supplier"
  | "ready-to-quote"
  | "awaiting-approval"
  | "unconfirmed-po"
  | "confirmed-po"
  | "in-process"
  | "overdue"
  | "closed";

export const WORK_QUEUE_TABS: {
  id: WorkQueueTab;
  label: string;
  statuses?: EnquiryStatus[];
}[] = [
  {
    id: "needs-rfq",
    label: "Needs RFQ",
    statuses: [EnquiryStatus.DRAFT, EnquiryStatus.ENQUIRY_RECEIVED],
  },
  {
    id: "awaiting-supplier",
    label: "Awaiting supplier quotes",
    statuses: [EnquiryStatus.RFQ_SENT],
  },
  {
    id: "ready-to-quote",
    label: "Ready to quote",
    statuses: [EnquiryStatus.SUPPLIER_QUOTES_RECEIVED],
  },
  {
    id: "awaiting-approval",
    label: "Awaiting approval",
    statuses: [EnquiryStatus.CUSTOMER_QUOTE_SENT, EnquiryStatus.AWAITING_APPROVAL],
  },
  {
    id: "unconfirmed-po",
    label: "Unconfirmed POs",
    statuses: [EnquiryStatus.APPROVED, EnquiryStatus.PO_RECEIVED],
  },
  {
    id: "confirmed-po",
    label: "Confirmed purchases",
    statuses: [EnquiryStatus.PURCHASE_SENT],
  },
  {
    id: "in-process",
    label: "In process",
  },
  {
    id: "overdue",
    label: "Overdue",
  },
  {
    id: "closed",
    label: "Closed",
    statuses: [
      EnquiryStatus.COMPLETED,
      EnquiryStatus.CANCELLED,
      EnquiryStatus.REJECTED,
    ],
  },
];

const OPEN_STATUSES: EnquiryStatus[] = [
  EnquiryStatus.DRAFT,
  EnquiryStatus.ENQUIRY_RECEIVED,
  EnquiryStatus.RFQ_SENT,
  EnquiryStatus.SUPPLIER_QUOTES_RECEIVED,
  EnquiryStatus.CUSTOMER_QUOTE_SENT,
  EnquiryStatus.AWAITING_APPROVAL,
  EnquiryStatus.APPROVED,
  EnquiryStatus.PO_RECEIVED,
  EnquiryStatus.PURCHASE_SENT,
];

export function statusesForTab(tab: WorkQueueTab): EnquiryStatus[] | undefined {
  if (tab === "in-process" || tab === "overdue") return OPEN_STATUSES;
  const found = WORK_QUEUE_TABS.find((t) => t.id === tab);
  return found?.statuses;
}

export function overdueFilterForTab(tab: WorkQueueTab) {
  if (tab !== "overdue") return undefined;
  return { dueDate: { lt: new Date() } };
}

export async function getWorkQueueCounts() {
  const [
    needsRfq,
    awaitingSupplier,
    readyToQuote,
    awaitingApproval,
    unconfirmedPo,
    confirmedPo,
    inProcess,
    closed,
    overdue,
  ] = await Promise.all([
    prisma.enquiry.count({
      where: {
        status: { in: [EnquiryStatus.DRAFT, EnquiryStatus.ENQUIRY_RECEIVED] },
      },
    }),
    prisma.enquiry.count({ where: { status: EnquiryStatus.RFQ_SENT } }),
    prisma.enquiry.count({
      where: { status: EnquiryStatus.SUPPLIER_QUOTES_RECEIVED },
    }),
    prisma.enquiry.count({
      where: {
        status: {
          in: [EnquiryStatus.CUSTOMER_QUOTE_SENT, EnquiryStatus.AWAITING_APPROVAL],
        },
      },
    }),
    prisma.enquiry.count({
      where: {
        status: { in: [EnquiryStatus.APPROVED, EnquiryStatus.PO_RECEIVED] },
      },
    }),
    prisma.enquiry.count({ where: { status: EnquiryStatus.PURCHASE_SENT } }),
    prisma.enquiry.count({ where: { status: { in: OPEN_STATUSES } } }),
    prisma.enquiry.count({
      where: {
        status: {
          in: [
            EnquiryStatus.COMPLETED,
            EnquiryStatus.CANCELLED,
            EnquiryStatus.REJECTED,
          ],
        },
      },
    }),
    prisma.enquiry.count({
      where: {
        status: { in: OPEN_STATUSES },
        dueDate: { lt: new Date() },
      },
    }),
  ]);

  return {
    needsRfq,
    awaitingSupplier,
    readyToQuote,
    awaitingApproval,
    unconfirmedPo,
    confirmedPo,
    inProcess,
    closed,
    overdue,
    actionItems: needsRfq + awaitingSupplier + readyToQuote + awaitingApproval + unconfirmedPo,
  };
}
