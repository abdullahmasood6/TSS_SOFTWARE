import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/panel";
import { SearchBar } from "@/components/ui/search-bar";
import { VesselsManager } from "@/components/master/vessels-manager";
import { requirePermission, can } from "@/lib/permissions";

export default async function VesselsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await requirePermission("vessels");
  const canEdit = can(session.user.role, "vessels.write");
  const [vessels, customers] = await Promise.all([
    prisma.vessel.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { imo: { contains: q, mode: "insensitive" } },
              { engineMake: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        customer: true,
        _count: { select: { enquiries: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Vessels"
        description="Ship registry linked to enquiries — name, IMO, engine, and manager."
      />
      <div className="mb-4">
        <SearchBar defaultValue={q} placeholder="Search vessel, IMO, engine…" />
      </div>
      <VesselsManager vessels={vessels} customers={customers} canEdit={canEdit} />
    </div>
  );
}
