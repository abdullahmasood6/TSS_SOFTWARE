import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/panel";
import { ContractsManager } from "@/components/procurement/contracts-manager";

export default async function ContractsPage() {
  const session = await requirePermission("contracts");
  const canEdit = can(session.user.role, "contracts.write");
  const [contracts, suppliers, ports] = await Promise.all([
    prisma.contract.findMany({
      include: { supplier: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.port.findMany({
      where: { active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Contracts & tenders"
        description="Framework agreements and open tenders by port and category."
      />
      <ContractsManager contracts={contracts} suppliers={suppliers} ports={ports} canEdit={canEdit} />
    </div>
  );
}
