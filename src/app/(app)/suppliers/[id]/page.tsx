import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney, decimalToNumber } from "@/lib/utils";
import { SupplierComplianceForm } from "@/components/master/supplier-compliance-form";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      rfqs: {
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          enquiry: { include: { customer: true } },
          quotes: true,
        },
      },
      supplierPurchases: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          enquiry: true,
          lines: true,
        },
      },
      supplierQuotes: {
        orderBy: { receivedAt: "desc" },
        take: 10,
        include: { lines: true, rfq: { include: { enquiry: true } } },
      },
      _count: {
        select: { rfqs: true, supplierQuotes: true, supplierPurchases: true },
      },
    },
  });

  if (!supplier) notFound();

  const purchaseSpend = supplier.supplierPurchases.reduce(
    (sum, p) =>
      sum +
      p.lines.reduce(
        (s, l) => s + decimalToNumber(l.unitCost) * decimalToNumber(l.quantity),
        0
      ),
    0
  );

  const openRfqs = supplier.rfqs.filter((r) => r.status !== "QUOTED" && r.quotes.length === 0)
    .length;

  return (
    <div>
      <PageHeader
        title={supplier.name}
        description={[supplier.code, supplier.country, supplier.contact]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={supplier.active ? "success" : "neutral"}>
              {supplier.active ? "Active" : "Inactive"}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link href="/suppliers">Back to list</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "RFQs", value: String(supplier._count.rfqs) },
          { label: "Open RFQs", value: String(openRfqs) },
          { label: "Quotes received", value: String(supplier._count.supplierQuotes) },
          { label: "Purchase spend", value: formatMoney(purchaseSpend) },
        ].map((k) => (
          <Panel key={k.label} className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-tss-slate">
              {k.label}
            </div>
            <div className="mt-1 text-xl font-semibold text-tss-navy">{k.value}</div>
          </Panel>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel className="p-4 text-sm lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-tss-navy">Profile</h3>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-tss-slate">Email</dt>
              <dd>{supplier.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-tss-slate">Phone</dt>
              <dd>{supplier.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-tss-slate">Lead time</dt>
              <dd>
                {supplier.leadTimeDays != null ? `${supplier.leadTimeDays} days` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-tss-slate">Brands served</dt>
              <dd>{supplier.brandsServed || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-tss-slate">Categories</dt>
              <dd>{supplier.categories || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-tss-slate">Ports</dt>
              <dd>{supplier.portsServed || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-tss-slate">KYC</dt>
              <dd>
                <Badge
                  tone={
                    supplier.kycStatus === "CLEAR"
                      ? "success"
                      : supplier.kycStatus === "BLOCKED"
                        ? "danger"
                        : "warning"
                  }
                >
                  {supplier.kycStatus}
                </Badge>
                {supplier.complianceHold ? (
                  <Badge tone="danger" className="ml-1">
                    Hold
                  </Badge>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-tss-slate">Kind</dt>
              <dd>{supplier.kind}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-tss-slate">Address</dt>
              <dd>{supplier.address || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-tss-slate">Notes</dt>
              <dd>{supplier.notes || "—"}</dd>
            </div>
          </dl>
        </Panel>
        <Panel className="p-4 text-sm">
          <h3 className="mb-3 text-sm font-semibold text-tss-navy">Recent purchases</h3>
          <ul className="space-y-2">
            {supplier.supplierPurchases.map((p) => {
              const total = p.lines.reduce(
                (s, l) => s + decimalToNumber(l.unitCost) * decimalToNumber(l.quantity),
                0
              );
              return (
                <li key={p.id}>
                  <a
                    href={`/api/pdf/purchase/${p.id}`}
                    className="font-medium text-tss-steel hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {p.number}
                  </a>
                  <div className="text-xs text-tss-slate">
                    {formatMoney(total, p.currency)} · {p.status} ·{" "}
                    <Link href={`/enquiries/${p.enquiryId}`} className="hover:underline">
                      {p.enquiry.number}
                    </Link>
                  </div>
                </li>
              );
            })}
            {supplier.supplierPurchases.length === 0 ? (
              <li className="text-tss-slate">No purchases yet.</li>
            ) : null}
          </ul>
        </Panel>
      </div>

      <div className="mb-6">
        <SupplierComplianceForm supplier={supplier} />
      </div>

      <Panel>
        <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
          RFQ history
        </div>
        <table className="w-full text-sm">
          <thead className="bg-tss-steel-soft/40 text-left text-xs uppercase text-tss-slate">
            <tr>
              <th className="px-4 py-2">RFQ</th>
              <th className="px-4 py-2">Enquiry / customer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Sent</th>
              <th className="px-4 py-2">Quotes</th>
            </tr>
          </thead>
          <tbody>
            {supplier.rfqs.map((r) => (
              <tr key={r.id} className="border-t border-tss-border/70">
                <td className="px-4 py-2.5">
                  <a
                    href={`/api/pdf/rfq/${r.id}`}
                    className="font-mono text-xs text-tss-steel hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {r.number}
                  </a>
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/enquiries/${r.enquiryId}`}
                    className="text-tss-steel hover:underline"
                  >
                    {r.enquiry.number}
                  </Link>
                  <div className="text-xs text-tss-slate">{r.enquiry.customer.name}</div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge
                    tone={
                      r.quotes.length > 0 || r.status === "QUOTED"
                        ? "success"
                        : r.status === "OPENED"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {r.quotes.length > 0 ? "QUOTED" : r.status}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-tss-slate">{formatDate(r.sentAt)}</td>
                <td className="px-4 py-2.5">{r.quotes.length}</td>
              </tr>
            ))}
            {supplier.rfqs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-tss-slate">
                  No RFQs sent to this supplier.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
