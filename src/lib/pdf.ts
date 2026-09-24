import PDFDocument from "pdfkit";
import { getCompanySettings } from "@/lib/documents";
import { decimalToNumber, formatDate } from "@/lib/utils";

function collect(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

async function header(doc: PDFKit.PDFDocument, title: string, number: string) {
  const settings = await getCompanySettings();
  doc.fillColor("#0b1f3a").fontSize(18).text(settings.shortName, 50, 45);
  doc.fontSize(9).fillColor("#5b6b7c").text(settings.companyName, 50, 68);
  if (settings.address) doc.text(settings.address, 50, 82);
  doc.fillColor("#0b1f3a").fontSize(14).text(title, 350, 45, { align: "right" });
  doc.fontSize(10).fillColor("#2f6fed").text(number, 350, 66, { align: "right" });
  doc.moveTo(50, 110).lineTo(545, 110).strokeColor("#d7e0ec").stroke();
  doc.fillColor("#102033");
}

export async function buildQuotePdf(quote: {
  number: string;
  currency: string;
  createdAt: Date;
  notes: string | null;
  customer: { name: string; address: string | null; contact: string | null };
  enquiry: { number: string; vesselName: string | null; reference: string | null };
  lines: {
    partNumber: string;
    description: string;
    quantity: unknown;
    unitSell: unknown;
  }[];
}) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const done = collect(doc);
  await header(doc, "CUSTOMER QUOTE", quote.number);

  let y = 125;
  doc.fontSize(10).text(`Customer: ${quote.customer.name}`, 50, y);
  y += 14;
  if (quote.customer.contact) {
    doc.text(`Contact: ${quote.customer.contact}`, 50, y);
    y += 14;
  }
  doc.text(`Enquiry: ${quote.enquiry.number}`, 50, y);
  y += 14;
  if (quote.enquiry.vesselName) {
    doc.text(`Vessel: ${quote.enquiry.vesselName}`, 50, y);
    y += 14;
  }
  doc.text(`Date: ${formatDate(quote.createdAt)}`, 50, y);
  y += 24;

  doc.fontSize(9).fillColor("#5b6b7c");
  doc.text("Part #", 50, y);
  doc.text("Description", 120, y);
  doc.text("Qty", 360, y);
  doc.text("Unit", 410, y);
  doc.text("Total", 480, y);
  y += 12;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 8;
  doc.fillColor("#102033").fontSize(9);

  let grand = 0;
  for (const line of quote.lines) {
    const qty = decimalToNumber(line.quantity as never);
    const unit = decimalToNumber(line.unitSell as never);
    const total = qty * unit;
    grand += total;
    doc.text(line.partNumber, 50, y, { width: 65 });
    doc.text(line.description, 120, y, { width: 230 });
    doc.text(String(qty), 360, y);
    doc.text(unit.toFixed(2), 410, y);
    doc.text(total.toFixed(2), 480, y);
    y += 28;
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
  }

  y += 10;
  doc.fontSize(11).text(`Total (${quote.currency}): ${grand.toFixed(2)}`, 350, y, {
    align: "right",
  });
  if (quote.notes) {
    y += 30;
    doc.fontSize(9).fillColor("#5b6b7c").text(`Notes: ${quote.notes}`, 50, y, { width: 480 });
  }

  doc.end();
  return done;
}

export async function buildRfqPdf(rfq: {
  number: string;
  sentAt: Date;
  supplier: { name: string; email: string | null };
  enquiry: {
    number: string;
    vesselName: string | null;
    customer: { name: string };
  };
  lines: {
    quantity: unknown;
    enquiryLine: { partNumber: string; description: string; unit: string };
  }[];
}) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const done = collect(doc);
  await header(doc, "REQUEST FOR QUOTATION", rfq.number);

  let y = 125;
  doc.fontSize(10).text(`Supplier: ${rfq.supplier.name}`, 50, y);
  y += 14;
  doc.text(`Enquiry: ${rfq.enquiry.number} · Customer: ${rfq.enquiry.customer.name}`, 50, y);
  y += 14;
  if (rfq.enquiry.vesselName) {
    doc.text(`Vessel: ${rfq.enquiry.vesselName}`, 50, y);
    y += 14;
  }
  doc.text(`Date: ${formatDate(rfq.sentAt)}`, 50, y);
  y += 24;

  doc.fontSize(9).fillColor("#5b6b7c");
  doc.text("Part #", 50, y);
  doc.text("Description", 140, y);
  doc.text("Qty", 420, y);
  doc.text("Unit", 480, y);
  y += 12;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 8;
  doc.fillColor("#102033");

  for (const line of rfq.lines) {
    doc.text(line.enquiryLine.partNumber, 50, y, { width: 85 });
    doc.text(line.enquiryLine.description, 140, y, { width: 270 });
    doc.text(String(decimalToNumber(line.quantity as never)), 420, y);
    doc.text(line.enquiryLine.unit, 480, y);
    y += 26;
  }

  y += 20;
  doc.fontSize(9).fillColor("#5b6b7c").text(
    "Please return unit prices, lead time, and validity to Northwharf.",
    50,
    y,
    { width: 480 }
  );

  doc.end();
  return done;
}

export async function buildPurchasePdf(purchase: {
  number: string;
  sentAt: Date | null;
  createdAt: Date;
  supplier: { name: string; address: string | null };
  enquiry: { number: string; customer: { name: string } };
  lines: {
    partNumber: string;
    description: string;
    quantity: unknown;
    unitCost: unknown;
    currency: string;
  }[];
}) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const done = collect(doc);
  await header(doc, "PURCHASE ORDER", purchase.number);

  let y = 125;
  doc.fontSize(10).text(`Supplier: ${purchase.supplier.name}`, 50, y);
  y += 14;
  doc.text(`Enquiry: ${purchase.enquiry.number}`, 50, y);
  y += 14;
  doc.text(`Customer (end): ${purchase.enquiry.customer.name}`, 50, y);
  y += 14;
  doc.text(`Date: ${formatDate(purchase.sentAt || purchase.createdAt)}`, 50, y);
  y += 24;

  doc.fontSize(9).fillColor("#5b6b7c");
  doc.text("Part #", 50, y);
  doc.text("Description", 120, y);
  doc.text("Qty", 360, y);
  doc.text("Unit cost", 410, y);
  doc.text("Total", 480, y);
  y += 12;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 8;
  doc.fillColor("#102033");

  let grand = 0;
  for (const line of purchase.lines) {
    const qty = decimalToNumber(line.quantity as never);
    const unit = decimalToNumber(line.unitCost as never);
    const total = qty * unit;
    grand += total;
    doc.text(line.partNumber, 50, y, { width: 65 });
    doc.text(line.description, 120, y, { width: 230 });
    doc.text(String(qty), 360, y);
    doc.text(unit.toFixed(2), 410, y);
    doc.text(total.toFixed(2), 480, y);
    y += 26;
  }

  y += 12;
  doc.fontSize(11).text(`Total: ${grand.toFixed(2)}`, 350, y, { align: "right" });
  doc.end();
  return done;
}
