import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";
import { PriceHistoryType } from "@prisma/client";

export type PartPriceIntel = {
  partNumber: string;
  lastSellPrice: number | null;
  lastSellDate: Date | null;
  bestSellPrice: number | null;
  lastCost: number | null;
  lastCostDate: Date | null;
  avgSellPrice: number | null;
  historyCount: number;
};

export async function getPartPriceIntel(partNumber: string): Promise<PartPriceIntel> {
  const rows = await prisma.priceHistory.findMany({
    where: { partNumber },
    orderBy: { recordedAt: "desc" },
  });

  const sells = rows.filter(
    (r) => r.type === PriceHistoryType.CUSTOMER_QUOTE || r.type === PriceHistoryType.SALE
  );
  const costs = rows.filter((r) => r.type === PriceHistoryType.SUPPLIER_COST);

  const lastSell = sells[0] ?? null;
  const lastCost = costs[0] ?? null;
  const sellPrices = sells.map((s) => decimalToNumber(s.unitPrice));
  const bestSell = sellPrices.length ? Math.max(...sellPrices) : null;
  const avgSell =
    sellPrices.length > 0
      ? sellPrices.reduce((a, b) => a + b, 0) / sellPrices.length
      : null;

  return {
    partNumber,
    lastSellPrice: lastSell ? decimalToNumber(lastSell.unitPrice) : null,
    lastSellDate: lastSell?.recordedAt ?? null,
    bestSellPrice: bestSell,
    lastCost: lastCost ? decimalToNumber(lastCost.unitPrice) : null,
    lastCostDate: lastCost?.recordedAt ?? null,
    avgSellPrice: avgSell,
    historyCount: rows.length,
  };
}

export function isUnderquote(proposedSell: number, previousSell: number | null) {
  if (previousSell == null) return false;
  return proposedSell <= previousSell;
}

export async function recordPriceHistory(input: {
  partId?: string | null;
  partNumber: string;
  description?: string | null;
  type: PriceHistoryType;
  unitPrice: number;
  currency?: string;
  quantity?: number;
  reference?: string;
  customerId?: string;
  supplierId?: string;
  enquiryId?: string;
  createdById?: string;
  notes?: string;
}) {
  return prisma.priceHistory.create({
    data: {
      partId: input.partId ?? undefined,
      partNumber: input.partNumber,
      description: input.description ?? undefined,
      type: input.type,
      unitPrice: input.unitPrice,
      currency: input.currency ?? "USD",
      quantity: input.quantity,
      reference: input.reference,
      customerId: input.customerId,
      supplierId: input.supplierId,
      enquiryId: input.enquiryId,
      createdById: input.createdById,
      notes: input.notes,
    },
  });
}
