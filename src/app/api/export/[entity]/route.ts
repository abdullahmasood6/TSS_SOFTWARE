import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { excelResponse, workbookToBuffer } from "@/lib/excel";
import { decimalToNumber } from "@/lib/utils";
import { EnquiryStatus } from "@prisma/client";

type Entity =
  | "customers"
  | "suppliers"
  | "catalog"
  | "enquiries"
  | "quotes"
  | "orders"
  | "price-history"
  | "enquiry";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { entity: raw } = await params;
  const entity = raw as Entity;
  const q = req.nextUrl.searchParams.get("q") || undefined;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const id = req.nextUrl.searchParams.get("id") || undefined;
  const stamp = new Date().toISOString().slice(0, 10);

  if (entity === "customers") {
    const rows = await prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { country: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
    });
    const buffer = workbookToBuffer([
      {
        name: "Customers",
        rows: rows.map((c) => ({
          Code: c.code || "",
          Name: c.name,
          Contact: c.contact || "",
          Email: c.email || "",
          Phone: c.phone || "",
          Country: c.country || "",
          Address: c.address || "",
          Notes: c.notes || "",
          Active: c.active ? "Yes" : "No",
          Updated: c.updatedAt.toISOString(),
        })),
      },
    ]);
    return excelResponse(buffer, `NW-Customers-${stamp}.xlsx`);
  }

  if (entity === "suppliers") {
    const rows = await prisma.supplier.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              { country: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
    });
    const buffer = workbookToBuffer([
      {
        name: "Suppliers",
        rows: rows.map((s) => ({
          Code: s.code || "",
          Name: s.name,
          Contact: s.contact || "",
          Email: s.email || "",
          Phone: s.phone || "",
          Country: s.country || "",
          "Lead Time Days": s.leadTimeDays ?? "",
          Notes: s.notes || "",
          Active: s.active ? "Yes" : "No",
        })),
      },
    ]);
    return excelResponse(buffer, `NW-Suppliers-${stamp}.xlsx`);
  }

  if (entity === "catalog") {
    const rows = await prisma.part.findMany({
      where: q
        ? {
            OR: [
              { partNumber: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { manufacturer: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { partNumber: "asc" },
      include: {
        priceHistory: {
          where: { type: { in: ["CUSTOMER_QUOTE", "SALE"] } },
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
      },
    });
    const buffer = workbookToBuffer([
      {
        name: "Catalog",
        rows: rows.map((p) => ({
          "Part Number": p.partNumber,
          Description: p.description,
          Manufacturer: p.manufacturer || "",
          Category: p.category || "",
          Unit: p.unit,
          "Last Sell Price": p.priceHistory[0]
            ? decimalToNumber(p.priceHistory[0].unitPrice)
            : "",
          "Last Sell Date": p.priceHistory[0]
            ? p.priceHistory[0].recordedAt.toISOString().slice(0, 10)
            : "",
          Notes: p.notes || "",
          Active: p.active ? "Yes" : "No",
        })),
      },
    ]);
    return excelResponse(buffer, `NW-Catalog-${stamp}.xlsx`);
  }

  if (entity === "enquiries") {
    const rows = await prisma.enquiry.findMany({
      where: {
        ...(status && status !== "ALL"
          ? { status: status as EnquiryStatus }
          : {}),
        ...(q
          ? {
              OR: [
                { number: { contains: q, mode: "insensitive" } },
                { subject: { contains: q, mode: "insensitive" } },
                { vesselName: { contains: q, mode: "insensitive" } },
                { customer: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { customer: true, owner: true, lines: true },
      orderBy: { updatedAt: "desc" },
    });
    const headerRows = rows.map((e) => ({
      Number: e.number,
      Customer: e.customer.name,
      Subject: e.subject || "",
      Vessel: e.vesselName || "",
      Reference: e.reference || "",
      Status: e.status,
      Owner: e.owner?.name || "",
      Lines: e.lines.length,
      Received: e.receivedAt.toISOString().slice(0, 10),
      Updated: e.updatedAt.toISOString().slice(0, 10),
      Notes: e.notes || "",
    }));
    const lineRows = rows.flatMap((e) =>
      e.lines.map((l) => ({
        Enquiry: e.number,
        Customer: e.customer.name,
        "Part Number": l.partNumber,
        Description: l.description,
        Qty: decimalToNumber(l.quantity),
        Unit: l.unit,
        Specs: l.specs || "",
        Notes: l.notes || "",
      }))
    );
    const buffer = workbookToBuffer([
      { name: "Enquiries", rows: headerRows },
      { name: "Lines", rows: lineRows },
    ]);
    return excelResponse(buffer, `NW-Enquiries-${stamp}.xlsx`);
  }

  if (entity === "enquiry" && id) {
    const e = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: true,
        rfqs: { include: { supplier: true, quotes: { include: { lines: true } } } },
        customerQuotes: { include: { lines: true } },
        purchaseOrders: true,
        supplierPurchases: { include: { supplier: true, lines: true } },
      },
    });
    if (!e) return new Response("Not found", { status: 404 });

    const buffer = workbookToBuffer([
      {
        name: "Summary",
        rows: [
          {
            Number: e.number,
            Customer: e.customer.name,
            Subject: e.subject || "",
            Vessel: e.vesselName || "",
            Status: e.status,
            Reference: e.reference || "",
            Notes: e.notes || "",
          },
        ],
      },
      {
        name: "Lines",
        rows: e.lines.map((l) => ({
          "Part Number": l.partNumber,
          Description: l.description,
          Qty: decimalToNumber(l.quantity),
          Unit: l.unit,
        })),
      },
      {
        name: "Supplier Quotes",
        rows: e.rfqs.flatMap((r) =>
          r.quotes.flatMap((q) =>
            q.lines.map((l) => ({
              RFQ: r.number,
              Supplier: r.supplier.name,
              "Part Number": l.partNumber,
              "Unit Cost": decimalToNumber(l.unitCost),
              Currency: l.currency,
            }))
          )
        ),
      },
      {
        name: "Customer Quotes",
        rows: e.customerQuotes.flatMap((q) =>
          q.lines.map((l) => ({
            Quote: q.number,
            Status: q.status,
            "Part Number": l.partNumber,
            Qty: decimalToNumber(l.quantity),
            Cost: decimalToNumber(l.unitCost),
            Sell: decimalToNumber(l.unitSell),
            "Prior Sell":
              l.previousSellPrice != null ? decimalToNumber(l.previousSellPrice) : "",
          }))
        ),
      },
      {
        name: "Purchases",
        rows: e.supplierPurchases.flatMap((p) =>
          p.lines.map((l) => ({
            PO: p.number,
            Supplier: p.supplier.name,
            "Part Number": l.partNumber,
            Qty: decimalToNumber(l.quantity),
            "Unit Cost": decimalToNumber(l.unitCost),
          }))
        ),
      },
    ]);
    return excelResponse(buffer, `${e.number}-${stamp}.xlsx`);
  }

  if (entity === "quotes") {
    const rows = await prisma.customerQuote.findMany({
      where: q
        ? {
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : undefined,
      include: { customer: true, enquiry: true, lines: true },
      orderBy: { createdAt: "desc" },
    });
    const buffer = workbookToBuffer([
      {
        name: "Quotes",
        rows: rows.map((q) => {
          const total = q.lines.reduce(
            (s, l) => s + decimalToNumber(l.quantity) * decimalToNumber(l.unitSell),
            0
          );
          return {
            Number: q.number,
            Customer: q.customer.name,
            Enquiry: q.enquiry.number,
            Status: q.status,
            Currency: q.currency,
            "Margin %": decimalToNumber(q.marginPct),
            Total: total,
            Sent: q.sentAt?.toISOString().slice(0, 10) || "",
            Created: q.createdAt.toISOString().slice(0, 10),
          };
        }),
      },
      {
        name: "Quote Lines",
        rows: rows.flatMap((q) =>
          q.lines.map((l) => ({
            Quote: q.number,
            "Part Number": l.partNumber,
            Description: l.description,
            Qty: decimalToNumber(l.quantity),
            Cost: decimalToNumber(l.unitCost),
            Sell: decimalToNumber(l.unitSell),
            "Prior Sell":
              l.previousSellPrice != null ? decimalToNumber(l.previousSellPrice) : "",
            "Underquote Reason": l.underquoteReason || "",
          }))
        ),
      },
    ]);
    return excelResponse(buffer, `NW-Quotes-${stamp}.xlsx`);
  }

  if (entity === "orders") {
    const [pos, purchases] = await Promise.all([
      prisma.purchaseOrder.findMany({
        include: { customer: true, enquiry: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.supplierPurchase.findMany({
        include: { supplier: true, enquiry: true, lines: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const buffer = workbookToBuffer([
      {
        name: "Customer POs",
        rows: pos.map((po) => ({
          "Document Number": po.number,
          "Customer PO Ref": po.customerPoRef || "",
          Customer: po.customer.name,
          Enquiry: po.enquiry.number,
          Received: po.receivedAt.toISOString().slice(0, 10),
          Notes: po.notes || "",
        })),
      },
      {
        name: "Supplier Purchases",
        rows: purchases.map((p) => ({
          Number: p.number,
          Supplier: p.supplier.name,
          Enquiry: p.enquiry.number,
          Status: p.status,
          Total: p.lines.reduce(
            (s, l) => s + decimalToNumber(l.quantity) * decimalToNumber(l.unitCost),
            0
          ),
          Sent: p.sentAt?.toISOString().slice(0, 10) || "",
        })),
      },
      {
        name: "Purchase Lines",
        rows: purchases.flatMap((p) =>
          p.lines.map((l) => ({
            PO: p.number,
            Supplier: p.supplier.name,
            "Part Number": l.partNumber,
            Description: l.description,
            Qty: decimalToNumber(l.quantity),
            "Unit Cost": decimalToNumber(l.unitCost),
          }))
        ),
      },
    ]);
    return excelResponse(buffer, `NW-Orders-${stamp}.xlsx`);
  }

  if (entity === "price-history") {
    const rows = await prisma.priceHistory.findMany({
      where: q
        ? {
            OR: [
              { partNumber: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { reference: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { recordedAt: "desc" },
      take: 5000,
    });
    const buffer = workbookToBuffer([
      {
        name: "Price History",
        rows: rows.map((r) => ({
          Date: r.recordedAt.toISOString().slice(0, 10),
          "Part Number": r.partNumber,
          Description: r.description || "",
          Type: r.type,
          "Unit Price": decimalToNumber(r.unitPrice),
          Currency: r.currency,
          Qty: r.quantity != null ? decimalToNumber(r.quantity) : "",
          Reference: r.reference || "",
          Notes: r.notes || "",
        })),
      },
    ]);
    return excelResponse(buffer, `NW-Price-History-${stamp}.xlsx`);
  }

  return new Response("Unknown export entity", { status: 400 });
}
