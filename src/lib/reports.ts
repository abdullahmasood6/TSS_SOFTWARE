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

export type MonthPoint = {
  key: string;
  label: string;
  revenue: number;
  cost: number;
  margin: number;
  quotes: number;
  purchases: number;
  purchaseSpend: number;
  enquiries: number;
};

export type ForecastPoint = {
  key: string;
  label: string;
  revenue: number;
  cost: number;
  margin: number;
  isForecast: boolean;
};

export type ReportRange = {
  from?: Date;
  to?: Date;
};

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function addMonths(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return monthKey(d);
}

/** Linear regression y = a + b*x over indices 0..n-1 */
function projectNext(values: number[], steps: number): number[] {
  const n = values.length;
  if (n === 0) return Array(steps).fill(0);
  if (n === 1) return Array(steps).fill(Math.max(0, values[0]));

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const b = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const a = sumY / n - b * (sumX / n);

  // Blend slope with trailing 3-month average growth for stability
  const trail = values.slice(-3);
  const avg = trail.reduce((s, v) => s + v, 0) / trail.length;
  const growth =
    values.length >= 2 && values[values.length - 2] > 0
      ? (values[values.length - 1] - values[values.length - 2]) /
        Math.max(values[values.length - 2], 1)
      : 0;

  const out: number[] = [];
  for (let s = 1; s <= steps; s++) {
    const linear = a + b * (n - 1 + s);
    const momentum = avg * Math.pow(1 + Math.max(-0.5, Math.min(0.5, growth)), s);
    const blended = linear * 0.55 + momentum * 0.45;
    out.push(Math.max(0, Math.round(blended * 100) / 100));
  }
  return out;
}

export async function getMarginReports(range: ReportRange = {}) {
  const from = range.from;
  const to = range.to;

  const quoteDateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  const purchaseDateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  const enquiryDateFilter =
    from || to
      ? {
          receivedAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

  const quotes = await prisma.customerQuote.findMany({
    where: { status: { in: ["SENT", "APPROVED"] }, ...quoteDateFilter },
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
  const monthly = new Map<string, MonthPoint>();

  function touchMonth(key: string) {
    if (!monthly.has(key)) {
      monthly.set(key, {
        key,
        label: monthLabel(key),
        revenue: 0,
        cost: 0,
        margin: 0,
        quotes: 0,
        purchases: 0,
        purchaseSpend: 0,
        enquiries: 0,
      });
    }
    return monthly.get(key)!;
  }

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

    const mk = monthKey(new Date(q.createdAt));
    const m = touchMonth(mk);
    m.revenue += revenue;
    m.cost += cost;
    m.quotes += 1;
  }

  const purchases = await prisma.supplierPurchase.findMany({
    where: purchaseDateFilter,
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

    const mk = monthKey(new Date(p.createdAt));
    const m = touchMonth(mk);
    m.purchases += 1;
    m.purchaseSpend += cost;
  }

  // Enquiry volume by month
  const enquiries = await prisma.enquiry.findMany({
    where: enquiryDateFilter,
    select: { id: true, receivedAt: true, status: true },
  });
  for (const e of enquiries) {
    const m = touchMonth(monthKey(new Date(e.receivedAt)));
    m.enquiries += 1;
  }

  // Supplier margin proxy
  const purchasesWithEnquiry = await prisma.supplierPurchase.findMany({
    where: purchaseDateFilter,
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

  // Fill monthly series continuously for last 8 months (or range)
  const now = to || new Date();
  const start = from || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 7, 1));
  const series: MonthPoint[] = [];
  let cursor = monthKey(start);
  const endKey = monthKey(now);
  for (let i = 0; i < 24; i++) {
    const raw = touchMonth(cursor);
    series.push({
      ...raw,
      margin: raw.revenue - raw.cost,
    });
    if (cursor === endKey) break;
    cursor = addMonths(cursor, 1);
  }

  const monthlySeries = series;

  const revForecast = projectNext(
    monthlySeries.map((m) => m.revenue),
    3
  );
  const costForecast = projectNext(
    monthlySeries.map((m) => m.cost),
    3
  );
  const lastKey = monthlySeries[monthlySeries.length - 1]?.key || monthKey(now);
  const forecast: ForecastPoint[] = [
    ...monthlySeries.map((m) => ({
      key: m.key,
      label: m.label,
      revenue: m.revenue,
      cost: m.cost,
      margin: m.margin,
      isForecast: false,
    })),
    ...revForecast.map((revenue, i) => {
      const key = addMonths(lastKey, i + 1);
      const cost = costForecast[i];
      return {
        key,
        label: monthLabel(key),
        revenue,
        cost,
        margin: revenue - cost,
        isForecast: true,
      };
    }),
  ];

  const openEnquiries = await prisma.enquiry.count({
    where: {
      status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] },
      ...enquiryDateFilter,
    },
  });

  const pipeline = await prisma.enquiry.groupBy({
    by: ["status"],
    where: enquiryDateFilter,
    _count: { _all: true },
  });

  const finalizedCustomers = finalize(byCustomer);
  const totalQuoteRevenue = finalizedCustomers.reduce((s, r) => s + r.quoteRevenue, 0);
  const totalMargin = finalizedCustomers.reduce((s, r) => s + r.margin, 0);
  const totalPurchaseSpend = purchases.reduce(
    (s, p) =>
      s +
      p.lines.reduce(
        (sum, l) => sum + decimalToNumber(l.unitCost) * decimalToNumber(l.quantity),
        0
      ),
    0
  );

  const next3 = forecast.filter((f) => f.isForecast);
  const forecastRevenue = next3.reduce((s, f) => s + f.revenue, 0);
  const forecastMargin = next3.reduce((s, f) => s + f.margin, 0);

  return {
    byCustomer: finalizedCustomers,
    byVessel: finalize(byVessel),
    bySupplier: finalize(bySupplier),
    byPort: finalize(byPort),
    monthly: monthlySeries,
    forecast,
    pipeline: pipeline
      .map((p) => ({ status: p.status, count: p._count._all }))
      .sort((a, b) => b.count - a.count),
    kpis: {
      openEnquiries,
      quoteCount: quotes.length,
      totalQuoteRevenue,
      totalMargin,
      avgMarginPct: totalQuoteRevenue > 0 ? (totalMargin / totalQuoteRevenue) * 100 : 0,
      totalPurchaseSpend,
      forecastRevenue,
      forecastMargin,
      enquiryCount: enquiries.length,
    },
  };
}
