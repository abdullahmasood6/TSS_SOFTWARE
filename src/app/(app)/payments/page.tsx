import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/panel";
import { PaymentsManager } from "@/components/procurement/payments-manager";

export default async function PaymentsPage() {
  await requireSession();
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
      <PaymentsManager invoices={invoices} payments={payments} suppliers={suppliers} />
    </div>
  );
}
