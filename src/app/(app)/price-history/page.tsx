import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Panel, EmptyState } from "@/components/ui/panel";
import { SearchBar } from "@/components/ui/search-bar";
import { ExportButton } from "@/components/ui/export-button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, decimalToNumber } from "@/lib/utils";
import { PriceHistoryType } from "@prisma/client";
import { requirePermission } from "@/lib/permissions";

export default async function PriceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q, type } = await searchParams;
  await requirePermission("price_history");
  const rows = await prisma.priceHistory.findMany({
    where: {
      ...(type && type !== "ALL" ? { type: type as PriceHistoryType } : {}),
      ...(q
        ? {
            OR: [
              { partNumber: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { reference: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { recordedAt: "desc" },
    take: 200,
  });

  const tone = (t: PriceHistoryType) => {
    if (t === PriceHistoryType.SALE) return "success" as const;
    if (t === PriceHistoryType.SUPPLIER_COST) return "neutral" as const;
    return "info" as const;
  };

  const types = ["ALL", ...Object.values(PriceHistoryType)];

  return (
    <div>
      <PageHeader
        title="Price history"
        description="Immutable price log — search, filter by type, and export to Excel."
        actions={<ExportButton entity="price-history" query={{ q }} />}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar defaultValue={q} placeholder="Search part number, description, reference…" />
        <div className="flex flex-wrap gap-1">
          {types.map((t) => {
            const active = (type || "ALL") === t;
            const href =
              t === "ALL"
                ? q
                  ? `/price-history?q=${encodeURIComponent(q)}`
                  : "/price-history"
                : `/price-history?type=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
            return (
              <Link
                key={t}
                href={href}
                className={`rounded px-2 py-1 text-[11px] font-semibold ${
                  active
                    ? "bg-tss-navy text-white"
                    : "border border-tss-border bg-white text-tss-slate hover:bg-tss-steel-soft"
                }`}
              >
                {t === "ALL" ? "All" : t.replace(/_/g, " ")}
              </Link>
            );
          })}
        </div>
      </div>

      <Panel>
        {rows.length === 0 ? (
          <EmptyState
            title="No price history"
            description="Quotes and supplier costs will appear here."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-tss-steel-soft/50 text-left text-xs uppercase tracking-wide text-tss-slate">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Part #</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Unit price</th>
                <th className="px-4 py-2">Reference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-tss-border/70">
                  <td className="px-4 py-2.5 text-tss-slate">{formatDate(r.recordedAt)}</td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/price-history?q=${encodeURIComponent(r.partNumber)}`}
                      className="font-mono text-xs font-semibold text-tss-steel hover:underline"
                    >
                      {r.partNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{r.description || "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={tone(r.type)}>{r.type.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {formatMoney(decimalToNumber(r.unitPrice), r.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-tss-slate">{r.reference || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
