"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession, assertCan } from "@/lib/permissions";
import { nextDocumentNumber } from "@/lib/documents";
import { threeWayMatch } from "@/lib/invoice-match";
import { decimalToNumber } from "@/lib/utils";
import type { ContractStatus, KycStatus, MarketplaceKind, PaymentStatus } from "@prisma/client";

function empty(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s || null;
}

export async function updateSupplierCompliance(id: string, formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "suppliers.compliance");

  const kycStatus = String(formData.get("kycStatus") || "PENDING") as KycStatus;
  const kind = String(formData.get("kind") || "SUPPLIER") as MarketplaceKind;
  const ratingRaw = String(formData.get("ratingScore") || "").trim();
  const termsRaw = String(formData.get("paymentTermsDays") || "").trim();

  await prisma.supplier.update({
    where: { id },
    data: {
      kind,
      kycStatus,
      kycNotes: empty(formData.get("kycNotes")),
      kycCheckedAt: new Date(),
      complianceHold: String(formData.get("complianceHold") || "") === "true",
      paymentTermsDays: termsRaw ? Number(termsRaw) : null,
      bankName: empty(formData.get("bankName")),
      bankAccountRef: empty(formData.get("bankAccountRef")),
      ratingScore: ratingRaw ? Number(ratingRaw) : null,
      categories: empty(formData.get("categories")) ?? undefined,
      portsServed: empty(formData.get("portsServed")) ?? undefined,
      brandsServed: empty(formData.get("brandsServed")) ?? undefined,
    },
  });
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  revalidatePath("/marketplace");
}

export async function createGoodsReceipt(purchaseId: string, formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "invoices.write");

  const purchase = await prisma.supplierPurchase.findUnique({
    where: { id: purchaseId },
    include: { lines: true, enquiry: true },
  });
  if (!purchase) throw new Error("Purchase not found");

  const linesJson = String(formData.get("lines") || "[]");
  const overrides = JSON.parse(linesJson) as {
    purchaseLineId?: string;
    partNumber: string;
    description: string;
    orderedQty: number;
    receivedQty: number;
  }[];

  const number = await nextDocumentNumber("receipt");
  const receipt = await prisma.goodsReceipt.create({
    data: {
      number,
      purchaseId,
      receivedById: session.user.id,
      deliveryPort: empty(formData.get("deliveryPort")) || purchase.deliveryPort,
      notes: empty(formData.get("notes")),
      lines: {
        create: (overrides.length
          ? overrides
          : purchase.lines.map((l) => ({
              purchaseLineId: l.id,
              partNumber: l.partNumber,
              description: l.description,
              orderedQty: Number(l.quantity),
              receivedQty: Number(l.quantity),
            }))
        ).map((l) => ({
          purchaseLineId: l.purchaseLineId || null,
          partNumber: l.partNumber,
          description: l.description,
          orderedQty: l.orderedQty,
          receivedQty: l.receivedQty,
        })),
      },
    },
  });

  await prisma.supplierPurchase.update({
    where: { id: purchaseId },
    data: { status: "RECEIVED", deliveredAt: new Date() },
  });

  if (purchase.enquiryId) {
    await prisma.documentEvent.create({
      data: {
        enquiryId: purchase.enquiryId,
        entityType: "GoodsReceipt",
        entityId: receipt.id,
        type: "ACKNOWLEDGED",
        label: `Goods receipt ${number}`,
        actorId: session.user.id,
      },
    });
  }

  revalidatePath("/orders");
  revalidatePath("/invoices");
  revalidatePath(`/enquiries/${purchase.enquiryId}`);
  return receipt.id;
}

export async function createSupplierInvoice(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "invoices.write");

  const purchaseId = empty(formData.get("purchaseId"));
  const supplierId = String(formData.get("supplierId") || "");
  if (!supplierId) throw new Error("Supplier required");

  const purchase = purchaseId
    ? await prisma.supplierPurchase.findUnique({
        where: { id: purchaseId },
        include: { lines: true, receipts: { include: { lines: true } } },
      })
    : null;

  const linesJson = String(formData.get("lines") || "");
  let lines: { partNumber: string; description: string; quantity: number; unitCost: number }[] =
    [];
  if (linesJson) {
    lines = JSON.parse(linesJson);
  } else if (purchase) {
    lines = purchase.lines.map((l) => ({
      partNumber: l.partNumber,
      description: l.description,
      quantity: decimalToNumber(l.quantity),
      unitCost: decimalToNumber(l.unitCost),
    }));
  }
  if (!lines.length) throw new Error("Invoice needs lines");

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const taxAmount = Number(formData.get("taxAmount") || 0);
  const totalAmount = subtotal + taxAmount;

  const receiptId =
    empty(formData.get("receiptId")) ||
    purchase?.receipts[0]?.id ||
    null;

  const match = purchase
    ? threeWayMatch({
        purchaseLines: purchase.lines.map((l) => ({
          partNumber: l.partNumber,
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
        receiptLines: (purchase.receipts.find((r) => r.id === receiptId) ||
          purchase.receipts[0])?.lines.map((l) => ({
          partNumber: l.partNumber,
          quantity: l.receivedQty,
        })) || [],
        invoiceLines: lines.map((l) => ({
          partNumber: l.partNumber,
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
      })
    : { status: "UNMATCHED" as const, notes: "No linked purchase" };

  const number = await nextDocumentNumber("invoice");
  const invoice = await prisma.supplierInvoice.create({
    data: {
      number,
      supplierId,
      purchaseId,
      receiptId,
      supplierInvRef: empty(formData.get("supplierInvRef")),
      currency: String(formData.get("currency") || "USD"),
      dueDate: empty(formData.get("dueDate"))
        ? new Date(String(formData.get("dueDate")))
        : null,
      subtotal,
      taxAmount,
      totalAmount,
      matchStatus: match.status,
      matchNotes: match.notes,
      notes: empty(formData.get("notes")),
      createdById: session.user.id,
      lines: {
        create: lines.map((l) => ({
          partNumber: l.partNumber,
          description: l.description,
          quantity: l.quantity,
          unitCost: l.unitCost,
          amount: l.quantity * l.unitCost,
        })),
      },
    },
  });

  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/orders");
  return invoice.id;
}

export async function rematchInvoice(invoiceId: string) {
  const session = await requireSession();
  assertCan(session.user.role, "invoices.write");

  const invoice = await prisma.supplierInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: true,
      purchase: { include: { lines: true } },
      receipt: { include: { lines: true } },
    },
  });
  if (!invoice?.purchase) throw new Error("Invoice has no purchase");

  const match = threeWayMatch({
    purchaseLines: invoice.purchase.lines.map((l) => ({
      partNumber: l.partNumber,
      quantity: l.quantity,
      unitCost: l.unitCost,
    })),
    receiptLines: (invoice.receipt?.lines || []).map((l) => ({
      partNumber: l.partNumber,
      quantity: l.receivedQty,
    })),
    invoiceLines: invoice.lines.map((l) => ({
      partNumber: l.partNumber,
      quantity: l.quantity,
      unitCost: l.unitCost,
    })),
  });

  await prisma.supplierInvoice.update({
    where: { id: invoiceId },
    data: { matchStatus: match.status, matchNotes: match.notes },
  });
  revalidatePath("/invoices");
}

export async function createPayment(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "payments.write");

  const supplierId = String(formData.get("supplierId") || "");
  const invoiceId = empty(formData.get("invoiceId"));
  const amount = Number(formData.get("amount") || 0);
  if (!supplierId || amount <= 0) throw new Error("Supplier and amount required");

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new Error("Supplier not found");
  if (supplier.kycStatus === "BLOCKED" || supplier.complianceHold) {
    throw new Error("Cannot pay blocked / compliance-hold supplier");
  }

  const number = await nextDocumentNumber("payment");
  const status = (empty(formData.get("status")) || "PENDING") as PaymentStatus;

  await prisma.payment.create({
    data: {
      number,
      supplierId,
      invoiceId,
      purchaseId: empty(formData.get("purchaseId")),
      currency: String(formData.get("currency") || "USD"),
      amount,
      status,
      method: empty(formData.get("method")),
      reference: empty(formData.get("reference")),
      scheduledAt: empty(formData.get("scheduledAt"))
        ? new Date(String(formData.get("scheduledAt")))
        : null,
      kycCleared: supplier.kycStatus === "CLEAR",
      notes: empty(formData.get("notes")),
      createdById: session.user.id,
      settledAt: status === "SETTLED" ? new Date() : null,
    },
  });

  if (invoiceId && status === "SETTLED") {
    await prisma.supplierInvoice.update({
      where: { id: invoiceId },
      data: { status: "PAID" },
    });
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
}

export async function updatePaymentStatus(id: string, status: PaymentStatus) {
  const session = await requireSession();
  assertCan(session.user.role, "payments.write");

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new Error("Payment not found");

  if (status === "SETTLED" || status === "AUTHORIZED") {
    const supplier = await prisma.supplier.findUnique({
      where: { id: payment.supplierId },
    });
    if (!supplier || supplier.kycStatus === "BLOCKED" || supplier.complianceHold) {
      throw new Error("KYC/compliance blocks settlement");
    }
  }

  await prisma.payment.update({
    where: { id },
    data: {
      status,
      settledAt: status === "SETTLED" ? new Date() : payment.settledAt,
      kycCleared: true,
    },
  });

  if (payment.invoiceId && status === "SETTLED") {
    await prisma.supplierInvoice.update({
      where: { id: payment.invoiceId },
      data: { status: "PAID" },
    });
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
}

export async function createContract(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "contracts.write");

  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title required");

  const number = await nextDocumentNumber("contract");
  const valueRaw = String(formData.get("valueAmount") || "").trim();
  const status = (empty(formData.get("status")) || "DRAFT") as ContractStatus;

  await prisma.contract.create({
    data: {
      number,
      title,
      supplierId: empty(formData.get("supplierId")),
      portId: empty(formData.get("portId")),
      portName: empty(formData.get("portName")),
      category: empty(formData.get("category")),
      status,
      isTender: String(formData.get("isTender") || "") === "true",
      currency: String(formData.get("currency") || "USD"),
      valueAmount: valueRaw ? Number(valueRaw) : null,
      startDate: empty(formData.get("startDate"))
        ? new Date(String(formData.get("startDate")))
        : null,
      endDate: empty(formData.get("endDate"))
        ? new Date(String(formData.get("endDate")))
        : null,
      terms: empty(formData.get("terms")),
      notes: empty(formData.get("notes")),
      createdById: session.user.id,
    },
  });

  revalidatePath("/contracts");
}

export async function updateContractStatus(id: string, status: ContractStatus) {
  const session = await requireSession();
  assertCan(session.user.role, "contracts.write");
  await prisma.contract.update({ where: { id }, data: { status } });
  revalidatePath("/contracts");
}
