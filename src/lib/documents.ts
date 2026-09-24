import { prisma } from "@/lib/db";

type SeqField =
  | "enqSeq"
  | "rfqSeq"
  | "quoteSeq"
  | "poSeq"
  | "purchaseSeq"
  | "invoiceSeq"
  | "receiptSeq"
  | "paymentSeq"
  | "contractSeq";

type PrefixField =
  | "enqPrefix"
  | "rfqPrefix"
  | "quotePrefix"
  | "poPrefix"
  | "purchasePrefix"
  | "invoicePrefix"
  | "receiptPrefix"
  | "paymentPrefix"
  | "contractPrefix";

const map: Record<
  | "enquiry"
  | "rfq"
  | "quote"
  | "po"
  | "purchase"
  | "invoice"
  | "receipt"
  | "payment"
  | "contract",
  { seq: SeqField; prefix: PrefixField; code: string }
> = {
  enquiry: { seq: "enqSeq", prefix: "enqPrefix", code: "ENQ" },
  rfq: { seq: "rfqSeq", prefix: "rfqPrefix", code: "RFQ" },
  quote: { seq: "quoteSeq", prefix: "quotePrefix", code: "QT" },
  po: { seq: "poSeq", prefix: "poPrefix", code: "CPO" },
  purchase: { seq: "purchaseSeq", prefix: "purchasePrefix", code: "PO" },
  invoice: { seq: "invoiceSeq", prefix: "invoicePrefix", code: "INV" },
  receipt: { seq: "receiptSeq", prefix: "receiptPrefix", code: "GRN" },
  payment: { seq: "paymentSeq", prefix: "paymentPrefix", code: "PAY" },
  contract: { seq: "contractSeq", prefix: "contractPrefix", code: "CTR" },
};

export async function nextDocumentNumber(
  type: keyof typeof map
): Promise<string> {
  const year = new Date().getFullYear();
  const cfg = map[type];

  const settings = await prisma.companySettings.findFirst();
  if (!settings) {
    throw new Error("Company settings not initialized");
  }

  const next = (settings[cfg.seq] as number) + 1;
  await prisma.companySettings.update({
    where: { id: settings.id },
    data: { [cfg.seq]: next },
  });

  const prefix = settings[cfg.prefix] as string;
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

export async function getCompanySettings() {
  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({ data: {} });
  }
  return settings;
}
