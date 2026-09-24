"use server";

import { revalidatePath } from "next/cache";
import { DocumentEventType, EnquiryStatus, PriceHistoryType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nextDocumentNumber, getCompanySettings } from "@/lib/documents";
import { requireSession, assertCan } from "@/lib/permissions";
import { getPartPriceIntel, isUnderquote, recordPriceHistory } from "@/lib/pricing";
import { logDocumentEvent } from "@/lib/document-events";
import { decimalToNumber } from "@/lib/utils";
import { z } from "zod";

export async function createEnquiry(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "enquiries.write");

  const customerId = String(formData.get("customerId") || "");
  const vesselId = String(formData.get("vesselId") || "").trim() || null;
  const subject = String(formData.get("subject") || "");
  const vesselName = String(formData.get("vesselName") || "");
  const category = String(formData.get("category") || "").trim() || null;
  const priority = String(formData.get("priority") || "NORMAL");
  const reference = String(formData.get("reference") || "");
  const deliveryPort = String(formData.get("deliveryPort") || "").trim() || null;
  const notes = String(formData.get("notes") || "");
  const dueDateRaw = String(formData.get("dueDate") || "").trim();
  const linesRaw = String(formData.get("lines") || "[]");
  const lines = z
    .array(
      z.object({
        partNumber: z.string().min(1),
        description: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().optional(),
        specs: z.string().optional(),
        notes: z.string().optional(),
        partId: z.string().optional(),
        impaCode: z.string().optional().nullable(),
        brand: z.string().optional().nullable(),
      })
    )
    .parse(JSON.parse(linesRaw));

  if (!customerId || lines.length === 0) {
    throw new Error("Customer and at least one line are required");
  }

  let resolvedVesselName = vesselName || null;
  if (vesselId) {
    const vessel = await prisma.vessel.findUnique({ where: { id: vesselId } });
    if (vessel) resolvedVesselName = vessel.name;
  }

  const number = await nextDocumentNumber("enquiry");

  const enquiry = await prisma.enquiry.create({
    data: {
      number,
      customerId,
      vesselId,
      ownerId: session.user.id,
      status: EnquiryStatus.ENQUIRY_RECEIVED,
      subject: subject || null,
      vesselName: resolvedVesselName,
      category,
      priority: priority || "NORMAL",
      reference: reference || null,
      deliveryPort,
      notes: notes || null,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      createdById: session.user.id,
      updatedById: session.user.id,
      lines: {
        create: lines.map((l, i) => ({
          partId: l.partId || null,
          partNumber: l.partNumber,
          description: l.description,
          impaCode: l.impaCode || null,
          brand: l.brand || null,
          quantity: l.quantity,
          unit: l.unit || "EA",
          specs: l.specs || null,
          notes: l.notes || null,
          sortOrder: i,
        })),
      },
    },
  });

  await logDocumentEvent({
    enquiryId: enquiry.id,
    entityType: "Enquiry",
    entityId: enquiry.id,
    type: DocumentEventType.CREATED,
    label: `Enquiry ${number} created`,
    actorId: session.user.id,
  });

  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
  return enquiry.id;
}

export async function sendRfqs(enquiryId: string, supplierIds: string[]) {
  const session = await requireSession();
  assertCan(session.user.role, "rfq.write");
  if (!supplierIds.length) throw new Error("Select at least one supplier");

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    include: { lines: true },
  });
  if (!enquiry) throw new Error("Enquiry not found");

  for (const supplierId of supplierIds) {
    const number = await nextDocumentNumber("rfq");
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 5);
    const rfq = await prisma.supplierRfq.create({
      data: {
        number,
        enquiryId,
        supplierId,
        status: "SENT",
        dueAt,
        createdById: session.user.id,
        lines: {
          create: enquiry.lines.map((l) => ({
            enquiryLineId: l.id,
            quantity: l.quantity,
          })),
        },
      },
      include: { supplier: true },
    });
    await logDocumentEvent({
      enquiryId,
      entityType: "SupplierRfq",
      entityId: rfq.id,
      type: DocumentEventType.SENT,
      label: `RFQ ${number} sent to ${rfq.supplier.name}`,
      actorId: session.user.id,
    });
  }

  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: {
      status: EnquiryStatus.RFQ_SENT,
      updatedById: session.user.id,
    },
  });

  revalidatePath(`/enquiries/${enquiryId}`);
  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
}

export async function logSupplierQuote(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "rfq.write");

  const rfqId = String(formData.get("rfqId") || "");
  const currency = String(formData.get("currency") || "USD");
  const leadTimeDays = formData.get("leadTimeDays")
    ? Number(formData.get("leadTimeDays"))
    : null;
  const notes = String(formData.get("notes") || "");
  const supplierRef = String(formData.get("supplierRef") || "");
  const lines = z
    .array(
      z.object({
        enquiryLineId: z.string(),
        partId: z.string().nullable().optional(),
        partNumber: z.string(),
        description: z.string(),
        quantity: z.number(),
        unitCost: z.number().nonnegative(),
      })
    )
    .parse(JSON.parse(String(formData.get("lines") || "[]")));

  const rfq = await prisma.supplierRfq.findUnique({
    where: { id: rfqId },
    include: { enquiry: true },
  });
  if (!rfq) throw new Error("RFQ not found");

  await prisma.supplierQuote.create({
    data: {
      number: supplierRef || null,
      rfqId,
      supplierId: rfq.supplierId,
      currency,
      leadTimeDays,
      notes: notes || null,
      createdById: session.user.id,
      lines: {
        create: lines.map((l) => ({
          enquiryLineId: l.enquiryLineId,
          partId: l.partId || null,
          partNumber: l.partNumber,
          description: l.description,
          quantity: l.quantity,
          unitCost: l.unitCost,
          currency,
        })),
      },
    },
  });

  for (const l of lines) {
    await recordPriceHistory({
      partId: l.partId,
      partNumber: l.partNumber,
      description: l.description,
      type: PriceHistoryType.SUPPLIER_COST,
      unitPrice: l.unitCost,
      currency,
      quantity: l.quantity,
      reference: supplierRef || rfq.number,
      supplierId: rfq.supplierId,
      enquiryId: rfq.enquiryId,
      createdById: session.user.id,
    });
  }

  await prisma.supplierRfq.update({
    where: { id: rfqId },
    data: { status: "QUOTED", respondedAt: new Date(), openedAt: new Date() },
  });

  await prisma.enquiry.update({
    where: { id: rfq.enquiryId },
    data: {
      status: EnquiryStatus.SUPPLIER_QUOTES_RECEIVED,
      updatedById: session.user.id,
    },
  });

  await logDocumentEvent({
    enquiryId: rfq.enquiryId,
    entityType: "SupplierQuote",
    entityId: rfqId,
    type: DocumentEventType.RESPONDED,
    label: `Supplier quote logged for RFQ ${rfq.number}`,
    actorId: session.user.id,
  });

  revalidatePath(`/enquiries/${rfq.enquiryId}`);
  revalidatePath("/price-history");
  revalidatePath("/dashboard");
}

export async function createCustomerQuote(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "quotes.write");

  const enquiryId = String(formData.get("enquiryId") || "");
  const marginPct = Number(formData.get("marginPct") || 15);
  const notes = String(formData.get("notes") || "");
  const underquoteNote = String(formData.get("underquoteNote") || "");
  const lines = z
    .array(
      z.object({
        enquiryLineId: z.string(),
        partId: z.string().nullable().optional(),
        partNumber: z.string(),
        description: z.string(),
        quantity: z.number(),
        unitCost: z.number(),
        unitSell: z.number(),
        supplierQuoteLineId: z.string().optional(),
        underquoteReason: z.string().optional(),
      })
    )
    .parse(JSON.parse(String(formData.get("lines") || "[]")));

  const enquiry = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
  if (!enquiry) throw new Error("Enquiry not found");

  const settings = await getCompanySettings();
  const number = await nextDocumentNumber("quote");

  let hasUnderquote = false;
  const enriched = [];
  for (const l of lines) {
    const intel = await getPartPriceIntel(l.partNumber);
    const under = isUnderquote(l.unitSell, intel.lastSellPrice);
    if (under) {
      hasUnderquote = true;
      if (!l.underquoteReason && !underquoteNote) {
        throw new Error(
          `Part ${l.partNumber} sell price is at or below previous quote of ${intel.lastSellPrice}. Provide a reason.`
        );
      }
    }
    enriched.push({
      ...l,
      previousSellPrice: intel.lastSellPrice,
      underquoteReason: under ? l.underquoteReason || underquoteNote : null,
    });
  }

  if (hasUnderquote && !underquoteNote && !enriched.some((e) => e.underquoteReason)) {
    throw new Error("Under-quote reason required");
  }

  const quote = await prisma.customerQuote.create({
    data: {
      number,
      enquiryId,
      customerId: enquiry.customerId,
      currency: settings.defaultCurrency,
      marginPct,
      status: "DRAFT",
      notes: notes || null,
      underquoteNote: underquoteNote || null,
      createdById: session.user.id,
      updatedById: session.user.id,
      lines: {
        create: enriched.map((l, i) => ({
          enquiryLineId: l.enquiryLineId,
          partId: l.partId || null,
          partNumber: l.partNumber,
          description: l.description,
          quantity: l.quantity,
          unitCost: l.unitCost,
          unitSell: l.unitSell,
          currency: settings.defaultCurrency,
          supplierQuoteLineId: l.supplierQuoteLineId || null,
          previousSellPrice: l.previousSellPrice,
          underquoteReason: l.underquoteReason,
          sortOrder: i,
        })),
      },
    },
  });

  for (const l of enriched) {
    await recordPriceHistory({
      partId: l.partId,
      partNumber: l.partNumber,
      description: l.description,
      type: PriceHistoryType.CUSTOMER_QUOTE,
      unitPrice: l.unitSell,
      currency: settings.defaultCurrency,
      quantity: l.quantity,
      reference: number,
      customerId: enquiry.customerId,
      enquiryId,
      createdById: session.user.id,
      notes: l.underquoteReason || undefined,
    });
  }

  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: {
      status: EnquiryStatus.CUSTOMER_QUOTE_SENT,
      updatedById: session.user.id,
    },
  });

  revalidatePath(`/enquiries/${enquiryId}`);
  revalidatePath("/quotes");
  revalidatePath("/price-history");
  revalidatePath("/dashboard");
  return quote.id;
}

export async function markQuoteSent(quoteId: string) {
  const session = await requireSession();
  assertCan(session.user.role, "quotes.write");
  const quote = await prisma.customerQuote.update({
    where: { id: quoteId },
    data: { status: "SENT", sentAt: new Date(), updatedById: session.user.id },
  });
  await prisma.enquiry.update({
    where: { id: quote.enquiryId },
    data: { status: EnquiryStatus.AWAITING_APPROVAL, updatedById: session.user.id },
  });
  await logDocumentEvent({
    enquiryId: quote.enquiryId,
    entityType: "CustomerQuote",
    entityId: quote.id,
    type: DocumentEventType.SENT,
    label: `Customer quote ${quote.number} sent`,
    actorId: session.user.id,
  });
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath(`/enquiries/${quote.enquiryId}`);
  revalidatePath("/dashboard");
}

export async function setQuoteApproval(quoteId: string, approved: boolean) {
  const session = await requireSession();
  assertCan(session.user.role, "quotes.approve");
  const quote = await prisma.customerQuote.update({
    where: { id: quoteId },
    data: {
      status: approved ? "APPROVED" : "REJECTED",
      updatedById: session.user.id,
    },
  });
  await prisma.enquiry.update({
    where: { id: quote.enquiryId },
    data: {
      status: approved ? EnquiryStatus.APPROVED : EnquiryStatus.REJECTED,
      updatedById: session.user.id,
    },
  });
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath(`/enquiries/${quote.enquiryId}`);
  revalidatePath("/dashboard");
}

export async function createPurchaseOrder(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "orders.customer_po");
  const enquiryId = String(formData.get("enquiryId") || "");
  const customerPoRef = String(formData.get("customerPoRef") || "");
  const notes = String(formData.get("notes") || "");

  const enquiry = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
  if (!enquiry) throw new Error("Enquiry not found");

  const number = await nextDocumentNumber("po");
  await prisma.purchaseOrder.create({
    data: {
      number,
      enquiryId,
      customerId: enquiry.customerId,
      customerPoRef: customerPoRef || null,
      notes: notes || null,
      createdById: session.user.id,
    },
  });

  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { status: EnquiryStatus.PO_RECEIVED, updatedById: session.user.id },
  });

  revalidatePath(`/enquiries/${enquiryId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
}

export async function createSupplierPurchase(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "orders.purchase");

  const enquiryId = String(formData.get("enquiryId") || "");
  const supplierId = String(formData.get("supplierId") || "");
  const lines = z
    .array(
      z.object({
        enquiryLineId: z.string(),
        partId: z.string().nullable().optional(),
        partNumber: z.string(),
        description: z.string(),
        quantity: z.number(),
        unitCost: z.number(),
      })
    )
    .parse(JSON.parse(String(formData.get("lines") || "[]")));

  const number = await nextDocumentNumber("purchase");
  const purchase = await prisma.supplierPurchase.create({
    data: {
      number,
      enquiryId,
      supplierId,
      status: "SENT",
      sentAt: new Date(),
      createdById: session.user.id,
      lines: {
        create: lines.map((l) => ({
          enquiryLineId: l.enquiryLineId,
          partId: l.partId || null,
          partNumber: l.partNumber,
          description: l.description,
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
      },
    },
  });

  for (const l of lines) {
    await recordPriceHistory({
      partId: l.partId,
      partNumber: l.partNumber,
      description: l.description,
      type: PriceHistoryType.SUPPLIER_COST,
      unitPrice: l.unitCost,
      quantity: l.quantity,
      reference: number,
      supplierId,
      enquiryId,
      createdById: session.user.id,
      notes: "Purchase order",
    });
  }

  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { status: EnquiryStatus.PURCHASE_SENT, updatedById: session.user.id },
  });

  revalidatePath(`/enquiries/${enquiryId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return purchase.id;
}

export async function completeEnquiry(enquiryId: string) {
  const session = await requireSession();
  assertCan(session.user.role, "orders.purchase");
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    include: { customerQuotes: { include: { lines: true } } },
  });
  if (!enquiry) throw new Error("Not found");

  const approvedQuote = enquiry.customerQuotes.find((q) => q.status === "APPROVED");
  if (approvedQuote) {
    for (const l of approvedQuote.lines) {
      await recordPriceHistory({
        partId: l.partId,
        partNumber: l.partNumber,
        description: l.description,
        type: PriceHistoryType.SALE,
        unitPrice: decimalToNumber(l.unitSell),
        currency: l.currency,
        quantity: decimalToNumber(l.quantity),
        reference: approvedQuote.number,
        customerId: enquiry.customerId,
        enquiryId,
        createdById: session.user.id,
      });
    }
  }

  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { status: EnquiryStatus.COMPLETED, updatedById: session.user.id },
  });

  revalidatePath(`/enquiries/${enquiryId}`);
  revalidatePath("/dashboard");
  revalidatePath("/price-history");
}

export async function updateSettings(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "settings.company");

  const settings = await getCompanySettings();
  await prisma.companySettings.update({
    where: { id: settings.id },
    data: {
      companyName: String(formData.get("companyName") || settings.companyName),
      shortName: String(formData.get("shortName") || settings.shortName),
      address: String(formData.get("address") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      email: String(formData.get("email") || "") || null,
      website: String(formData.get("website") || "") || null,
      defaultCurrency: String(formData.get("defaultCurrency") || "USD"),
      defaultMarginPct: Number(formData.get("defaultMarginPct") || 15),
      ...(formData.get("enqPrefix")
        ? { enqPrefix: String(formData.get("enqPrefix")) }
        : {}),
      ...(formData.get("rfqPrefix")
        ? { rfqPrefix: String(formData.get("rfqPrefix")) }
        : {}),
      ...(formData.get("quotePrefix")
        ? { quotePrefix: String(formData.get("quotePrefix")) }
        : {}),
      ...(formData.get("poPrefix") ? { poPrefix: String(formData.get("poPrefix")) } : {}),
      ...(formData.get("purchasePrefix")
        ? { purchasePrefix: String(formData.get("purchasePrefix")) }
        : {}),
    },
  });
  revalidatePath("/settings");
}

export async function getPriceIntelAction(partNumber: string) {
  await requireSession();
  return getPartPriceIntel(partNumber);
}

export async function updateEnquiryDetails(enquiryId: string, formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "enquiries.write");

  const customerId = String(formData.get("customerId") || "");
  const vesselId = String(formData.get("vesselId") || "").trim() || null;
  const subject = String(formData.get("subject") || "").trim();
  const vesselName = String(formData.get("vesselName") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;
  const priority = String(formData.get("priority") || "NORMAL");
  const reference = String(formData.get("reference") || "").trim();
  const deliveryPort = String(formData.get("deliveryPort") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim();
  const statusRaw = String(formData.get("status") || "");
  const ownerId = String(formData.get("ownerId") || "").trim();
  const dueDateRaw = String(formData.get("dueDate") || "").trim();

  let resolvedVesselName = vesselName || null;
  if (vesselId) {
    const vessel = await prisma.vessel.findUnique({ where: { id: vesselId } });
    if (vessel) resolvedVesselName = vessel.name;
  }

  const data: {
    customerId?: string;
    vesselId: string | null;
    subject: string | null;
    vesselName: string | null;
    category: string | null;
    priority: string;
    reference: string | null;
    deliveryPort: string | null;
    notes: string | null;
    dueDate: Date | null;
    status?: EnquiryStatus;
    ownerId?: string | null;
    updatedById: string;
  } = {
    vesselId,
    subject: subject || null,
    vesselName: resolvedVesselName,
    category,
    priority,
    reference: reference || null,
    deliveryPort,
    notes: notes || null,
    dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
    updatedById: session.user.id,
  };

  if (customerId) data.customerId = customerId;
  if (ownerId) data.ownerId = ownerId;
  if (statusRaw && Object.values(EnquiryStatus).includes(statusRaw as EnquiryStatus)) {
    data.status = statusRaw as EnquiryStatus;
  }

  await prisma.enquiry.update({ where: { id: enquiryId }, data });
  revalidatePath(`/enquiries/${enquiryId}`);
  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
}

export async function replaceEnquiryLines(enquiryId: string, formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "enquiries.write");

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    include: { rfqs: true, customerQuotes: true, supplierPurchases: true },
  });
  if (!enquiry) throw new Error("Enquiry not found");
  if (
    enquiry.rfqs.length > 0 ||
    enquiry.customerQuotes.length > 0 ||
    enquiry.supplierPurchases.length > 0
  ) {
    throw new Error(
      "Cannot replace lines after RFQs, quotes, or purchases exist. Cancel and create a new enquiry, or adjust notes only."
    );
  }

  const lines = z
    .array(
      z.object({
        partNumber: z.string().min(1),
        description: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().optional(),
        partId: z.string().optional().nullable(),
        impaCode: z.string().optional().nullable(),
        brand: z.string().optional().nullable(),
        specs: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .parse(JSON.parse(String(formData.get("lines") || "[]")));

  if (!lines.length) throw new Error("At least one line is required");

  await prisma.$transaction(async (tx) => {
    await tx.enquiryLine.deleteMany({ where: { enquiryId } });
    await tx.enquiry.update({
      where: { id: enquiryId },
      data: {
        updatedById: session.user.id,
        lines: {
          create: lines.map((l, i) => ({
            partId: l.partId || null,
            partNumber: l.partNumber,
            description: l.description,
            impaCode: l.impaCode || null,
            brand: l.brand || null,
            quantity: l.quantity,
            unit: l.unit || "EA",
            specs: l.specs || null,
            notes: l.notes || null,
            sortOrder: i,
          })),
        },
      },
    });
  });

  revalidatePath(`/enquiries/${enquiryId}`);
  revalidatePath("/enquiries");
}

export async function cancelEnquiry(enquiryId: string) {
  const session = await requireSession();
  assertCan(session.user.role, "enquiries.write");
  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { status: EnquiryStatus.CANCELLED, updatedById: session.user.id },
  });
  revalidatePath(`/enquiries/${enquiryId}`);
  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
}

export async function updateCustomerQuote(quoteId: string, formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "quotes.write");

  const quote = await prisma.customerQuote.findUnique({
    where: { id: quoteId },
    include: { lines: true },
  });
  if (!quote) throw new Error("Quote not found");
  if (!["DRAFT", "SENT"].includes(quote.status)) {
    throw new Error("Only draft or sent quotes can be edited");
  }

  const notes = String(formData.get("notes") || "").trim();
  const marginPct = Number(formData.get("marginPct") || quote.marginPct);
  const lineUpdates = z
    .array(
      z.object({
        id: z.string(),
        unitSell: z.number().nonnegative(),
        underquoteReason: z.string().optional().nullable(),
      })
    )
    .parse(JSON.parse(String(formData.get("lines") || "[]")));

  for (const line of lineUpdates) {
    const existing = quote.lines.find((l) => l.id === line.id);
    if (!existing) continue;
    const prev =
      existing.previousSellPrice != null
        ? decimalToNumber(existing.previousSellPrice)
        : null;
    if (prev != null && line.unitSell <= prev && !line.underquoteReason) {
      throw new Error(
        `Part ${existing.partNumber}: sell ≤ prior ${prev}. Provide under-quote reason.`
      );
    }
    await prisma.customerQuoteLine.update({
      where: { id: line.id },
      data: {
        unitSell: line.unitSell,
        underquoteReason: line.underquoteReason || null,
      },
    });
  }

  await prisma.customerQuote.update({
    where: { id: quoteId },
    data: {
      notes: notes || null,
      marginPct,
      updatedById: session.user.id,
    },
  });

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
}

export async function updatePurchaseOrderNotes(poId: string, formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "orders.customer_po");
  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      customerPoRef: String(formData.get("customerPoRef") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
    },
  });
  revalidatePath("/orders");
}

export async function updateSupplierPurchaseStatus(purchaseId: string, status: string) {
  const session = await requireSession();
  assertCan(session.user.role, "orders.purchase");
  await prisma.supplierPurchase.update({
    where: { id: purchaseId },
    data: { status },
  });
  revalidatePath("/orders");
}
