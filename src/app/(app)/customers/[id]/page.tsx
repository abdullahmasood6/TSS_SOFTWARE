import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/lib/status";
import { formatDate, formatMoney, decimalToNumber } from "@/lib/utils";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      vessels: { where: { active: true }, orderBy: { name: "asc" } },
      enquiries: {
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: {
          owner: true,
          _count: { select: { lines: true, customerQuotes: true } },
        },
      },
      customerQuotes: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { lines: true, enquiry: true },
      },
      purchaseOrders: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { enquiry: true },
      },
      _count: {
        select: { enquiries: true, vessels: true, customerQuotes: true, purchaseOrders: true },
      },
    },
  });

  if (!customer) notFound();

  const openEnquiries = customer.enquiries.filter(
    (e) => !["COMPLETED", "CANCELLED", "REJECTED"].includes(e.status)
  ).length;

  const quoteRevenue = customer.customerQuotes
    .filter((q) => ["SENT", "APPROVED"].includes(q.status))
    .reduce(
      (sum, q) =>
        sum +
        q.lines.reduce(
          (s, l) => s + decimalToNumber(l.unitSell) * decimalToNumber(l.quantity),
          0
        ),
      0
    );

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={[customer.code, customer.country, customer.contact]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={customer.active ? "success" : "neutral"}>
              {customer.active ? "Active" : "Inactive"}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link href="/customers">Back to list</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/enquiries/new`}>New enquiry</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Enquiries", value: String(customer._count.enquiries) },
          { label: "Open (recent)", value: String(openEnquiries) },
          { label: "Vessels", value: String(customer._count.vessels) },
          { label: "Quoted revenue", value: formatMoney(quoteRevenue) },
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
          <h3 className="mb-3 text-sm font-semibold text-tss-navy">Contact</h3>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-tss-slate">Email</dt>
              <dd>{customer.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-tss-slate">Phone</dt>
              <dd>{customer.phone || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-tss-slate">Address</dt>
              <dd>{customer.address || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-tss-slate">Notes</dt>
              <dd>{customer.notes || "—"}</dd>
            </div>
          </dl>
        </Panel>
        <Panel className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-tss-navy">Fleet vessels</h3>
          {customer.vessels.length === 0 ? (
            <p className="text-sm text-tss-slate">No vessels linked.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {customer.vessels.map((v) => (
                <li key={v.id}>
                  <Link href="/vessels" className="font-medium text-tss-steel hover:underline">
                    {v.name}
                  </Link>
                  <div className="text-xs text-tss-slate">
                    {[v.imo && `IMO ${v.imo}`, v.flag, v.vesselType].filter(Boolean).join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mb-6">
        <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
          Recent enquiries
        </div>
        <table className="w-full text-sm">
          <thead className="bg-tss-steel-soft/40 text-left text-xs uppercase text-tss-slate">
            <tr>
              <th className="px-4 py-2">Number</th>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Owner</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {customer.enquiries.map((e) => (
              <tr key={e.id} className="border-t border-tss-border/70">
                <td className="px-4 py-2.5">
                  <Link href={`/enquiries/${e.id}`} className="text-tss-steel hover:underline">
                    {e.number}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <div>{e.vesselName || "—"}</div>
                  <div className="text-xs text-tss-slate">{e.subject || ""}</div>
                </td>
                <td className="px-4 py-2.5 text-tss-slate">{e.owner?.name || "—"}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={e.status} />
                </td>
                <td className="px-4 py-2.5 text-tss-slate">{formatDate(e.updatedAt)}</td>
              </tr>
            ))}
            {customer.enquiries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-tss-slate">
                  No enquiries yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
            Quotes
          </div>
          <ul className="divide-y divide-tss-border/70 text-sm">
            {customer.customerQuotes.map((q) => {
              const total = q.lines.reduce(
                (s, l) => s + decimalToNumber(l.unitSell) * decimalToNumber(l.quantity),
                0
              );
              return (
                <li key={q.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div>
                    <Link href={`/quotes/${q.id}`} className="font-medium text-tss-steel hover:underline">
                      {q.number}
                    </Link>
                    <div className="text-xs text-tss-slate">
                      {q.enquiry.number} · {formatDate(q.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>{formatMoney(total, q.currency)}</div>
                    <Badge tone={q.status === "APPROVED" ? "success" : "info"}>{q.status}</Badge>
                  </div>
                </li>
              );
            })}
            {customer.customerQuotes.length === 0 ? (
              <li className="px-4 py-6 text-tss-slate">No quotes.</li>
            ) : null}
          </ul>
        </Panel>

        <Panel>
          <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
            Customer POs
          </div>
          <ul className="divide-y divide-tss-border/70 text-sm">
            {customer.purchaseOrders.map((po) => (
              <li key={po.id} className="px-4 py-2.5">
                <div className="font-medium">{po.number}</div>
                <div className="text-xs text-tss-slate">
                  {po.customerPoRef ? `Ref ${po.customerPoRef} · ` : ""}
                  <Link href={`/enquiries/${po.enquiryId}`} className="text-tss-steel hover:underline">
                    {po.enquiry.number}
                  </Link>
                  {" · "}
                  {formatDate(po.receivedAt)}
                </div>
              </li>
            ))}
            {customer.purchaseOrders.length === 0 ? (
              <li className="px-4 py-6 text-tss-slate">No purchase orders.</li>
            ) : null}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
