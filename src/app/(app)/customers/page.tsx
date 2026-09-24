import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/panel";
import { ExportButton } from "@/components/ui/export-button";
import { SearchBar } from "@/components/ui/search-bar";
import { CustomersManager } from "@/components/master/customers-manager";
import { requirePermission, can } from "@/lib/permissions";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await requirePermission("customers");
  const canEdit = can(session.user.role, "customers.write");
  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { country: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Ship managers, owners, and fleet contacts. Edit inline and export to Excel."
        actions={<ExportButton entity="customers" query={{ q }} />}
      />
      <div className="mb-4">
        <SearchBar defaultValue={q} placeholder="Search customers…" />
      </div>
      <CustomersManager customers={customers} canEdit={canEdit} />
    </div>
  );
}
