import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Panel, EmptyState } from "@/components/ui/panel";
import { StatusBadge } from "@/lib/status";
import { formatMoney, decimalToNumber, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q || "").trim();

  if (!query) {
    return (
      <div>
        <PageHeader title="Search" description="Search enquiries, parts, customers, vessels, and quotes." />
        <EmptyState title="Enter a search term" description="Use the top search bar." />
      </div>
    );
  }

  const [enquiries, parts, customers, vessels, quotes, suppliers] = await Promise.all([
    prisma.enquiry.findMany({
      where: {
        OR: [
          { number: { contains: query, mode: "insensitive" } },
          { subject: { contains: query, mode: "insensitive" } },
          { vesselName: { contains: query, mode: "insensitive" } },
          { reference: { contains: query, mode: "insensitive" } },
          { customer: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: { customer: true },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.part.findMany({
      where: {
        OR: [
          { partNumber: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { manufacturer: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { partNumber: "asc" },
    }),
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 15,
    }),
    prisma.vessel.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { imo: { contains: query, mode: "insensitive" } },
          { engineMake: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { customer: true },
      take: 15,
    }),
    prisma.customerQuote.findMany({
      where: {
        OR: [
          { number: { contains: query, mode: "insensitive" } },
          { customer: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: { customer: true, lines: true },
      take: 15,
    }),
    prisma.supplier.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 15,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={`Search: “${query}”`}
        description={`${enquiries.length + parts.length + customers.length + vessels.length + quotes.length + suppliers.length} results`}
      />

      <div className="space-y-4">
        <ResultBlock title="Enquiries" empty={enquiries.length === 0}>
          {enquiries.map((e) => (
            <Row
              key={e.id}
              href={`/enquiries/${e.id}`}
              title={e.number}
              subtitle={`${e.customer.name} · ${e.vesselName || "—"}`}
              right={<StatusBadge status={e.status} />}
            />
          ))}
        </ResultBlock>

        <ResultBlock title="Parts" empty={parts.length === 0}>
          {parts.map((p) => (
            <Row
              key={p.id}
              href={`/price-history?q=${encodeURIComponent(p.partNumber)}`}
              title={p.partNumber}
              subtitle={`${p.description}${p.manufacturer ? ` · ${p.manufacturer}` : ""}`}
            />
          ))}
        </ResultBlock>

        <ResultBlock title="Vessels" empty={vessels.length === 0}>
          {vessels.map((v) => (
            <Row
              key={v.id}
              href="/vessels"
              title={v.name}
              subtitle={`${v.imo || "No IMO"} · ${v.customer?.name || "Unassigned"}`}
            />
          ))}
        </ResultBlock>

        <ResultBlock title="Customers" empty={customers.length === 0}>
          {customers.map((c) => (
            <Row
              key={c.id}
              href="/customers"
              title={c.name}
              subtitle={c.country || c.email || "—"}
            />
          ))}
        </ResultBlock>

        <ResultBlock title="Quotes" empty={quotes.length === 0}>
          {quotes.map((q) => {
            const total = q.lines.reduce(
              (s, l) => s + decimalToNumber(l.quantity) * decimalToNumber(l.unitSell),
              0
            );
            return (
              <Row
                key={q.id}
                href={`/quotes/${q.id}`}
                title={q.number}
                subtitle={`${q.customer.name} · ${formatDate(q.createdAt)}`}
                right={
                  <span className="text-sm font-medium">
                    {formatMoney(total, q.currency)}{" "}
                    <Badge tone="info">{q.status}</Badge>
                  </span>
                }
              />
            );
          })}
        </ResultBlock>

        <ResultBlock title="Suppliers" empty={suppliers.length === 0}>
          {suppliers.map((s) => (
            <Row key={s.id} href="/suppliers" title={s.name} subtitle={s.country || "—"} />
          ))}
        </ResultBlock>
      </div>
    </div>
  );
}

function ResultBlock({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Panel>
      <div className="border-b border-tss-border px-4 py-2.5 text-sm font-semibold text-tss-navy">
        {title}
      </div>
      {empty ? (
        <div className="px-4 py-6 text-sm text-tss-slate">No matches</div>
      ) : (
        <div className="divide-y divide-tss-border/70">{children}</div>
      )}
    </Panel>
  );
}

function Row({
  href,
  title,
  subtitle,
  right,
}: {
  href: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-tss-steel-soft/30"
    >
      <div>
        <div className="font-medium text-tss-steel">{title}</div>
        <div className="text-xs text-tss-slate">{subtitle}</div>
      </div>
      {right}
    </Link>
  );
}
