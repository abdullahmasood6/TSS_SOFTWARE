import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/panel";
import { InvoicesManager } from "./invoices-manager";

export default async function InvoicesPage() {
  await requireSession();
  const [purchases, invoices, suppliers] = await Promise.all([
    prisma.supplierPurchase.findMany({
      where: { status: { in: ["SENT", "CONFIRMED", "SHIPPED", "RECEIVED", "CLOSED"] } },
      include: {
        supplier: true,
        lines: true,
        receipts: { select: { id: true, number: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.supplierInvoice.findMany({
      include: { supplier: true, purchase: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.supplier.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Invoices & receipts"
        description="Goods receipt, supplier e-invoices, and three-way matching against purchase orders."
      />
      <InvoicesManager
        purchases={purchases.map((p) => ({
          id: p.id,
          number: p.number,
          supplierId: p.supplierId,
          supplierName: p.supplier.name,
          currency: p.currency,
          deliveryPort: p.deliveryPort,
          lines: p.lines,
          receipts: p.receipts,
        }))}
        invoices={invoices}
        suppliers={suppliers}
      />
    </div>
  );
}
