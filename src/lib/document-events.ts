import { DocumentEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function logDocumentEvent(input: {
  enquiryId: string;
  entityType: string;
  entityId?: string | null;
  type: DocumentEventType;
  label: string;
  actorId?: string | null;
  notes?: string | null;
  occurredAt?: Date;
  tx?: Prisma.TransactionClient;
}) {
  const db = input.tx ?? prisma;
  return db.documentEvent.create({
    data: {
      enquiryId: input.enquiryId,
      entityType: input.entityType,
      entityId: input.entityId || null,
      type: input.type,
      label: input.label,
      actorId: input.actorId || null,
      notes: input.notes || null,
      occurredAt: input.occurredAt || new Date(),
    },
  });
}
