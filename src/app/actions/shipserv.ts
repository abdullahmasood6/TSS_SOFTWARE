"use server";

import { revalidatePath } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { DocumentEventType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession, assertCan } from "@/lib/permissions";
import { logDocumentEvent } from "@/lib/document-events";
import { nextDocumentNumber } from "@/lib/documents";
import { EnquiryStatus } from "@prisma/client";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function createEnquiryTemplate(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "templates.write");

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const category = String(formData.get("category") || "").trim() || null;
  const lines = z
    .array(
      z.object({
        partId: z.string().optional().nullable(),
        partNumber: z.string().min(1),
        description: z.string().min(1),
        impaCode: z.string().optional().nullable(),
        brand: z.string().optional().nullable(),
        quantity: z.number().positive(),
        unit: z.string().optional(),
      })
    )
    .parse(JSON.parse(String(formData.get("lines") || "[]")));

  if (!name || !lines.length) throw new Error("Name and at least one line required");

  await prisma.enquiryTemplate.create({
    data: {
      name,
      description,
      category,
      createdById: session.user.id,
      lines: {
        create: lines.map((l, i) => ({
          partId: l.partId || null,
          partNumber: l.partNumber,
          description: l.description,
          impaCode: l.impaCode || null,
          brand: l.brand || null,
          quantity: l.quantity,
          unit: l.unit || "EA",
          sortOrder: i,
        })),
      },
    },
  });

  revalidatePath("/templates");
  revalidatePath("/enquiries/new");
}

export async function deleteEnquiryTemplate(id: string) {
  const session = await requireSession();
  assertCan(session.user.role, "templates.write");
  await prisma.enquiryTemplate.delete({ where: { id } });
  revalidatePath("/templates");
  revalidatePath("/enquiries/new");
}

export async function createEnquiryFromTemplate(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "enquiries.write");

  const templateId = String(formData.get("templateId") || "");
  const customerId = String(formData.get("customerId") || "");
  const vesselId = String(formData.get("vesselId") || "").trim() || null;
  const subject = String(formData.get("subject") || "").trim();
  const vesselName = String(formData.get("vesselName") || "").trim();
  const deliveryPort = String(formData.get("deliveryPort") || "").trim() || null;
  const reference = String(formData.get("reference") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  const template = await prisma.enquiryTemplate.findUnique({
    where: { id: templateId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) throw new Error("Template not found");
  if (!customerId) throw new Error("Customer required");

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
      subject: subject || template.name,
      vesselName: resolvedVesselName,
      category: template.category,
      deliveryPort,
      reference,
      notes,
      createdById: session.user.id,
      updatedById: session.user.id,
      lines: {
        create: template.lines.map((l, i) => ({
          partId: l.partId,
          partNumber: l.partNumber,
          description: l.description,
          impaCode: l.impaCode,
          brand: l.brand,
          quantity: l.quantity,
          unit: l.unit,
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
    label: `Enquiry created from template “${template.name}”`,
    actorId: session.user.id,
  });

  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
  return enquiry.id;
}

export async function uploadEnquiryAttachment(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "enquiries.write");

  const enquiryId = String(formData.get("enquiryId") || "");
  const label = String(formData.get("label") || "").trim() || null;
  const file = formData.get("file");
  if (!enquiryId || !(file instanceof File)) throw new Error("Enquiry and file required");
  if (file.size > 15 * 1024 * 1024) throw new Error("File must be under 15MB");

  const enquiry = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
  if (!enquiry) throw new Error("Enquiry not found");

  await ensureUploadDir();
  const ext = path.extname(file.name).slice(0, 12);
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  const attachment = await prisma.attachment.create({
    data: {
      enquiryId,
      fileName: storedName,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      label,
      uploadedById: session.user.id,
    },
  });

  await logDocumentEvent({
    enquiryId,
    entityType: "Attachment",
    entityId: attachment.id,
    type: DocumentEventType.NOTE,
    label: `Attachment uploaded: ${file.name}`,
    actorId: session.user.id,
  });

  revalidatePath(`/enquiries/${enquiryId}`);
}

export async function deleteEnquiryAttachment(id: string) {
  const session = await requireSession();
  assertCan(session.user.role, "enquiries.write");

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) throw new Error("Not found");

  try {
    await fs.unlink(path.join(UPLOAD_DIR, attachment.fileName));
  } catch {
    // file may already be missing
  }

  await prisma.attachment.delete({ where: { id } });
  if (attachment.enquiryId) {
    revalidatePath(`/enquiries/${attachment.enquiryId}`);
  }
}

export async function addDocumentNote(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "enquiries.write");

  const enquiryId = String(formData.get("enquiryId") || "");
  const label = String(formData.get("label") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!enquiryId || !label) throw new Error("Enquiry and label required");

  await logDocumentEvent({
    enquiryId,
    entityType: "Note",
    type: DocumentEventType.NOTE,
    label,
    notes,
    actorId: session.user.id,
  });

  revalidatePath(`/enquiries/${enquiryId}`);
}

export async function markRfqOpened(rfqId: string) {
  const session = await requireSession();
  assertCan(session.user.role, "rfq.write");

  const rfq = await prisma.supplierRfq.update({
    where: { id: rfqId },
    data: {
      openedAt: new Date(),
      status: "OPENED",
    },
    include: { supplier: true },
  });

  await logDocumentEvent({
    enquiryId: rfq.enquiryId,
    entityType: "SupplierRfq",
    entityId: rfq.id,
    type: DocumentEventType.OPENED,
    label: `Marked RFQ ${rfq.number} opened by ${rfq.supplier.name}`,
    actorId: session.user.id,
  });

  revalidatePath(`/enquiries/${rfq.enquiryId}`);
}

export async function markRfqAcknowledged(rfqId: string) {
  const session = await requireSession();
  assertCan(session.user.role, "rfq.write");

  const rfq = await prisma.supplierRfq.findUnique({
    where: { id: rfqId },
    include: { supplier: true },
  });
  if (!rfq) throw new Error("RFQ not found");

  await logDocumentEvent({
    enquiryId: rfq.enquiryId,
    entityType: "SupplierRfq",
    entityId: rfq.id,
    type: DocumentEventType.ACKNOWLEDGED,
    label: `RFQ ${rfq.number} acknowledged by ${rfq.supplier.name}`,
    actorId: session.user.id,
  });

  revalidatePath(`/enquiries/${rfq.enquiryId}`);
}

export async function setRfqDueDate(rfqId: string, dueAt: string | null) {
  const session = await requireSession();
  assertCan(session.user.role, "rfq.write");

  const rfq = await prisma.supplierRfq.update({
    where: { id: rfqId },
    data: { dueAt: dueAt ? new Date(dueAt) : null },
  });
  revalidatePath(`/enquiries/${rfq.enquiryId}`);
}
