import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/utils";

export type ReportRow = {
  id: string;
  name: string;
  enquiries: number;
  quoteCount: number;
  quoteRevenue: number;
  costTotal: number;
  margin: number;
  marginPct: number;
  poCount: number;
};

export async function getMarginReports() {
  const quotes = await prisma.customerQuote.findMany({
    where: { status: { in: ["SENT", "APPROVED"] } },
    include: {
      lines: true,
      customer: true,
      enquiry: {
        include: {
          vessel: true,
          supplierPurchases: { include: { lines: true } },
        },
      },
    },
  });

  const byCustomer = new Map<string, ReportRow>();
  const byVessel = new Map<string, ReportRow>();
  const bySupplier = new Map<string, ReportRow>();
  const byPort = new Map<string, ReportRow>();

  function bump(
    map: Map<string, ReportRow>,
    id: string,
    name: string,
    patch: Partial<ReportRow>
  ) {
    const cur = map.get(id) || {
      id,
      name,
      enquiries: 0,
      quoteCount: 0,
      quoteRevenue: 0,
      costTotal: 0,
      margin: 0,
      marginPct: 0,
      poCount: 0,
    };
    map.set(id, {
      ...cur,
      enquiries: cur.enquiries + (patch.enquiries || 0),
      quoteCount: cur.quoteCount + (patch.quoteCount || 0),
      quoteRevenue: cur.quoteRevenue + (patch.quoteRevenue || 0),
      costTotal: cur.costTotal + (patch.costTotal || 0),
      poCount: cur.poCount + (patch.poCount || 0),
      margin: 0,
      marginPct: 0,
    });
  }

  const seenEnquiryCustomer = new Set<string>();
  const seenEnquiryVessel = new Set<string>();

  for (const q of quotes) {
    const revenue = q.lines.reduce(
      (sum, l) => sum + decimalToNumber(l.unitSell) * decimalToNumber(l.quantity),
      0
    );
    const cost = q.lines.reduce(
      (sum, l) => sum + decimalToNumber(l.unitCost) * decimalToNumber(l.quantity),
      0
    );

    bump(byCustomer, q.customerId, q.customer.name, {
      quoteCount: 1,
      quoteRevenue: revenue,
      costTotal: cost,
    });
    if (!seenEnquiryCustomer.has(`${q.enquiryId}:${q.customerId}`)) {
      seenEnquiryCustomer.add(`${q.enquiryId}:${q.customerId}`);
      bump(byCustomer, q.customerId, q.customer.name, { enquiries: 1 });
    }

    const vesselKey = q.enquiry.vesselId || q.enquiry.vesselName || "unassigned";
    const vesselName =
      q.enquiry.vessel?.name || q.enquiry.vesselName || "Unassigned vessel";
    bump(byVessel, vesselKey, vesselName, {
      quoteCount: 1,
      quoteRevenue: revenue,
      costTotal: cost,
    });
    if (!seenEnquiryVessel.has(`${q.enquiryId}:${vesselKey}`)) {
      seenEnquiryVessel.add(`${q.enquiryId}:${vesselKey}`);
      bump(byVessel, vesselKey, vesselName, { enquiries: 1 });
    }
  }

  const purchases = await prisma.supplierPurchase.findMany({
    include: {
      supplier: true,
      lines: true,
    },
  });

  for (const p of purchases) {
    const cost = p.lines.reduce(
      (sum, l) => sum + decimalToNumber(l.unitCost) * decimalToNumber(l.quantity),
      0
    );
    bump(bySupplier, p.supplierId, p.supplier.name, {
      poCount: 1,
      costTotal: cost,
      enquiries: 1,
    });
    const portName = p.deliveryPort?.trim() || "Unassigned port";
    bump(byPort, portName.toLowerCase(), portName, {
      poCount: 1,
      costTotal: cost,
      enquiries: 1,
    });
  }

  // Supplier margin proxy: match purchase cost against enquiry quote revenue
  const purchasesWithEnquiry = await prisma.supplierPurchase.findMany({
    include: {
      supplier: true,
      enquiry: {
        include: {
          customerQuotes: {
            where: { status: { in: ["SENT", "APPROVED"] } },
            include: { lines: true },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      },
      lines: true,
    },
  });

  for (const p of purchasesWithEnquiry) {
    const quote = p.enquiry.customerQuotes[0];
    if (!quote) continue;
    const revenue = quote.lines.reduce(
      (sum, l) => sum + decimalToNumber(l.unitSell) * decimalToNumber(l.quantity),
      0
    );
    const existing = bySupplier.get(p.supplierId);
    if (existing) {
      existing.quoteRevenue += revenue / Math.max(1, p.enquiry.customerQuotes.length || 1);
    }
  }

  function finalize(rows: Map<string, ReportRow>) {
    return Array.from(rows.values())
      .map((r) => {
        const margin = r.quoteRevenue - r.costTotal;
        return {
          ...r,
          margin,
          marginPct: r.quoteRevenue > 0 ? (margin / r.quoteRevenue) * 100 : 0,
        };
      })
      .sort((a, b) => b.quoteRevenue - a.quoteRevenue || b.costTotal - a.costTotal);
  }

  const openEnquiries = await prisma.enquiry.count({
    where: { status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] } },
  });
  const totalQuoteRevenue = finalize(byCustomer).reduce((s, r) => s + r.quoteRevenue, 0);
  const totalMargin = finalize(byCustomer).reduce((s, r) => s + r.margin, 0);

  return {
    byCustomer: finalize(byCustomer),
    byVessel: finalize(byVessel),
    bySupplier: finalize(bySupplier),
    byPort: finalize(byPort),
    kpis: {
      openEnquiries,
      quoteCount: quotes.length,
      totalQuoteRevenue,
      totalMargin,
      avgMarginPct: totalQuoteRevenue > 0 ? (totalMargin / totalQuoteRevenue) * 100 : 0,
    },
  };
}
