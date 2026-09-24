import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/panel";
import { ExportButton } from "@/components/ui/export-button";
import { SearchBar } from "@/components/ui/search-bar";
import { CatalogManager } from "@/components/master/catalog-manager";
import { decimalToNumber } from "@/lib/utils";
import { PriceHistoryType } from "@prisma/client";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const parts = await prisma.part.findMany({
    where: q
      ? {
          OR: [
            { partNumber: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { manufacturer: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { impaCode: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { partNumber: "asc" },
    include: {
      priceHistory: {
        where: { type: { in: [PriceHistoryType.CUSTOMER_QUOTE, PriceHistoryType.SALE] } },
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Parts catalog"
        description="Master spare parts with last quoted sell price. Edit and export to Excel."
        actions={<ExportButton entity="catalog" query={{ q }} />}
      />
      <div className="mb-4">
        <SearchBar defaultValue={q} placeholder="Search part number or description…" />
      </div>
      <CatalogManager
        parts={parts.map((p) => ({
          id: p.id,
          partNumber: p.partNumber,
          description: p.description,
          manufacturer: p.manufacturer,
          brand: p.brand,
          impaCode: p.impaCode,
          category: p.category,
          unit: p.unit,
          notes: p.notes,
          active: p.active,
          lastSell: p.priceHistory[0]
            ? {
                price: decimalToNumber(p.priceHistory[0].unitPrice),
                date: p.priceHistory[0].recordedAt,
                currency: p.priceHistory[0].currency,
              }
            : null,
        }))}
      />
    </div>
  );
}
