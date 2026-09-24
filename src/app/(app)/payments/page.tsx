import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/panel";
import { PaymentsManager } from "@/components/procurement/payments-manager";

export default async function PaymentsPage() {
  const session = await requirePermission("payments");
  const canEdit = can(session.user.role, "payments.write");
  const [invoices, payments, suppliers] = await Promise.all([
    prisma.supplierInvoice.findMany({
      where: { status: { not: "PAID" } },
      include: {
        supplier: { select: { name: true, kycStatus: true, complianceHold: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.payment.findMany({
      include: {
        supplier: { select: { name: true } },
        invoice: { select: { number: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.supplier.findMany({
      where: { active: true },
      select: { id: true, name: true, kycStatus: true, complianceHold: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Authorize and settle supplier payments with KYC / compliance gates."
      />
      <PaymentsManager invoices={invoices} payments={payments} suppliers={suppliers} canEdit={canEdit} />
    </div>
  );
}
