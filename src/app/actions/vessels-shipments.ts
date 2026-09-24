"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession, assertCan } from "@/lib/permissions";

export async function createVessel(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "vessels.write");

  await prisma.vessel.create({
    data: {
      name: String(formData.get("name") || "").trim(),
      imo: String(formData.get("imo") || "").trim() || null,
      flag: String(formData.get("flag") || "").trim() || null,
      vesselType: String(formData.get("vesselType") || "").trim() || null,
      engineMake: String(formData.get("engineMake") || "").trim() || null,
      engineModel: String(formData.get("engineModel") || "").trim() || null,
      customerId: String(formData.get("customerId") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
    },
  });
  revalidatePath("/vessels");
}

export async function updateVessel(id: string, formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "vessels.write");

  await prisma.vessel.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim(),
      imo: String(formData.get("imo") || "").trim() || null,
      flag: String(formData.get("flag") || "").trim() || null,
      vesselType: String(formData.get("vesselType") || "").trim() || null,
      engineMake: String(formData.get("engineMake") || "").trim() || null,
      engineModel: String(formData.get("engineModel") || "").trim() || null,
      customerId: String(formData.get("customerId") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
    },
  });
  revalidatePath("/vessels");
}

export async function updateShipment(purchaseId: string, formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "orders.purchase");

  const status = String(formData.get("status") || "").trim();
  const trackingNo = String(formData.get("trackingNo") || "").trim() || null;
  const carrier = String(formData.get("carrier") || "").trim() || null;
  const deliveryPort = String(formData.get("deliveryPort") || "").trim() || null;
  const etdRaw = String(formData.get("etd") || "").trim();
  const etaRaw = String(formData.get("eta") || "").trim();

  const data: {
    status?: string;
    trackingNo: string | null;
    carrier: string | null;
    deliveryPort: string | null;
    etd: Date | null;
    eta: Date | null;
    shippedAt?: Date | null;
    deliveredAt?: Date | null;
  } = {
    trackingNo,
    carrier,
    deliveryPort,
    etd: etdRaw ? new Date(etdRaw) : null,
    eta: etaRaw ? new Date(etaRaw) : null,
  };

  if (status) {
    data.status = status;
    if (status === "SHIPPED") data.shippedAt = new Date();
    if (status === "RECEIVED" || status === "CLOSED") data.deliveredAt = new Date();
  }

  const purchase = await prisma.supplierPurchase.update({
    where: { id: purchaseId },
    data,
  });

  revalidatePath("/orders");
  revalidatePath(`/enquiries/${purchase.enquiryId}`);
}
