import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/panel";
import { ExportButton } from "@/components/ui/export-button";
import { SearchBar } from "@/components/ui/search-bar";
import { SuppliersManager } from "@/components/master/suppliers-manager";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const suppliers = await prisma.supplier.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { country: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="OEM and aftermarket sources. Edit, activate/deactivate, and export."
        actions={<ExportButton entity="suppliers" query={{ q }} />}
      />
      <div className="mb-4">
        <SearchBar defaultValue={q} placeholder="Search suppliers…" />
      </div>
      <SuppliersManager suppliers={suppliers} />
    </div>
  );
}
