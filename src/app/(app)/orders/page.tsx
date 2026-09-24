import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/panel";
import { ExportButton } from "@/components/ui/export-button";
import { SearchBar } from "@/components/ui/search-bar";
import { OrdersManager } from "@/components/orders/orders-manager";
import { decimalToNumber } from "@/lib/utils";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const filter = q
    ? {
        OR: [
          { number: { contains: q, mode: "insensitive" as const } },
          { customerPoRef: { contains: q, mode: "insensitive" as const } },
          { customer: { name: { contains: q, mode: "insensitive" as const } } },
          { enquiry: { number: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : undefined;

  const purchaseFilter = q
    ? {
        OR: [
          { number: { contains: q, mode: "insensitive" as const } },
          { trackingNo: { contains: q, mode: "insensitive" as const } },
          { carrier: { contains: q, mode: "insensitive" as const } },
          { deliveryPort: { contains: q, mode: "insensitive" as const } },
          { supplier: { name: { contains: q, mode: "insensitive" as const } } },
          { enquiry: { number: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : undefined;

  const [purchaseOrders, purchases] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      include: { customer: true, enquiry: true },
    }),
    prisma.supplierPurchase.findMany({
      where: purchaseFilter,
      orderBy: { createdAt: "desc" },
      include: { supplier: true, enquiry: true, lines: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Search POs and shipments by number, carrier, tracking, or port."
        actions={<ExportButton entity="orders" />}
      />
      <div className="mb-4">
        <SearchBar defaultValue={q} placeholder="Search PO #, customer, tracking, port…" />
      </div>
      <OrdersManager
        purchaseOrders={purchaseOrders.map((po) => ({
          id: po.id,
          number: po.number,
          customerPoRef: po.customerPoRef,
          notes: po.notes,
          receivedAt: po.receivedAt,
          enquiryId: po.enquiryId,
          customer: { name: po.customer.name },
          enquiry: { number: po.enquiry.number },
        }))}
        purchases={purchases.map((p) => ({
          id: p.id,
          number: p.number,
          status: p.status,
          currency: p.currency,
          sentAt: p.sentAt,
          trackingNo: p.trackingNo,
          carrier: p.carrier,
          etd: p.etd,
          eta: p.eta,
          deliveryPort: p.deliveryPort,
          supplier: { name: p.supplier.name },
          enquiry: { number: p.enquiry.number },
          enquiryId: p.enquiryId,
          lines: p.lines.map((l) => ({
            quantity: decimalToNumber(l.quantity),
            unitCost: decimalToNumber(l.unitCost),
          })),
        }))}
      />
    </div>
  );
}
