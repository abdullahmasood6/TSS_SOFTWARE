import { EnquiryStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const labels: Record<EnquiryStatus, string> = {
  DRAFT: "Draft",
  ENQUIRY_RECEIVED: "Enquiry received",
  RFQ_SENT: "RFQ sent",
  SUPPLIER_QUOTES_RECEIVED: "Supplier quotes in",
  CUSTOMER_QUOTE_SENT: "Customer quote sent",
  AWAITING_APPROVAL: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PO_RECEIVED: "PO received",
  PURCHASE_SENT: "Purchase sent",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const tones: Record<EnquiryStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  ENQUIRY_RECEIVED: "info",
  RFQ_SENT: "info",
  SUPPLIER_QUOTES_RECEIVED: "info",
  CUSTOMER_QUOTE_SENT: "warning",
  AWAITING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  PO_RECEIVED: "success",
  PURCHASE_SENT: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export function statusLabel(status: EnquiryStatus) {
  return labels[status];
}

export function StatusBadge({ status }: { status: EnquiryStatus }) {
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}

export const PIPELINE_ORDER: EnquiryStatus[] = [
  EnquiryStatus.DRAFT,
  EnquiryStatus.ENQUIRY_RECEIVED,
  EnquiryStatus.RFQ_SENT,
  EnquiryStatus.SUPPLIER_QUOTES_RECEIVED,
  EnquiryStatus.CUSTOMER_QUOTE_SENT,
  EnquiryStatus.AWAITING_APPROVAL,
  EnquiryStatus.APPROVED,
  EnquiryStatus.PO_RECEIVED,
  EnquiryStatus.PURCHASE_SENT,
  EnquiryStatus.COMPLETED,
];
