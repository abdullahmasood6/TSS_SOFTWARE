import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/permissions";
import { PageHeader, Panel, EmptyState } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import { ExportButton } from "@/components/ui/export-button";
import { SearchBar } from "@/components/ui/search-bar";
import { Badge } from "@/components/ui/badge";
import { EnquiryStatus } from "@prisma/client";

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    mine?: string;
    priority?: string;
    owner?: string;
  }>;
}) {
  const session = await requireSession();
  const { q, status, mine, priority, owner } = await searchParams;
  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const enquiries = await prisma.enquiry.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as EnquiryStatus } : {}),
      ...(mine === "1" ? { ownerId: session.user.id } : {}),
      ...(owner ? { ownerId: owner } : {}),
      ...(priority === "URGENT" ? { priority: "URGENT" } : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              { subject: { contains: q, mode: "insensitive" } },
              { vesselName: { contains: q, mode: "insensitive" } },
              { deliveryPort: { contains: q, mode: "insensitive" } },
              { reference: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    include: { customer: true, owner: true, _count: { select: { lines: true, rfqs: true } } },
  });

  const statuses = ["ALL", ...Object.values(EnquiryStatus)];

  function hrefWith(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const next = {
      q,
      status: status || "ALL",
      mine,
      priority,
      owner,
      ...patch,
    };
    if (next.q) params.set("q", next.q);
    if (next.status && next.status !== "ALL") params.set("status", next.status);
    if (next.mine === "1") params.set("mine", "1");
    if (next.priority === "URGENT") params.set("priority", "URGENT");
    if (next.owner) params.set("owner", next.owner);
    const s = params.toString();
    return s ? `/enquiries?${s}` : "/enquiries";
  }

  return (
    <div>
      <PageHeader
        title="Enquiries"
        description="Search, filter by owner/priority, edit, and export the pipeline."
        actions={
          <div className="flex gap-2">
            <ExportButton entity="enquiries" query={{ q, status }} />
            <Button asChild>
              <Link href="/enquiries/new">New enquiry</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBar defaultValue={q} placeholder="Search number, customer, vessel, port…" />
          <div className="flex flex-wrap gap-1">
            <Link
              href={hrefWith({ mine: mine === "1" ? undefined : "1" })}
              className={`rounded px-2 py-1 text-[11px] font-semibold ${
                mine === "1"
                  ? "bg-tss-navy text-white"
                  : "border border-tss-border bg-white text-tss-slate hover:bg-tss-steel-soft"
              }`}
            >
              Mine
            </Link>
            <Link
              href={hrefWith({ priority: priority === "URGENT" ? undefined : "URGENT" })}
              className={`rounded px-2 py-1 text-[11px] font-semibold ${
                priority === "URGENT"
                  ? "bg-tss-danger text-white"
                  : "border border-tss-border bg-white text-tss-slate hover:bg-tss-steel-soft"
              }`}
            >
              Urgent
            </Link>
          </div>
        </div>

        <form className="flex flex-wrap items-center gap-2" action="/enquiries" method="get">
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {status && status !== "ALL" ? <input type="hidden" name="status" value={status} /> : null}
          {mine === "1" ? <input type="hidden" name="mine" value="1" /> : null}
          {priority === "URGENT" ? <input type="hidden" name="priority" value="URGENT" /> : null}
          <label className="text-xs font-semibold uppercase text-tss-slate">Owner</label>
          <select
            name="owner"
            defaultValue={owner || ""}
            className="flex h-9 rounded-md border border-tss-border bg-white px-2 text-sm"
          >
            <option value="">All owners</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="outline">
            Apply owner
          </Button>
        </form>

        <div className="flex flex-wrap gap-1">
          {statuses.slice(0, 9).map((s) => {
            const active = (status || "ALL") === s;
            return (
              <Link
                key={s}
                href={hrefWith({ status: s === "ALL" ? undefined : s })}
                className={`rounded px-2 py-1 text-[11px] font-semibold ${
                  active
                    ? "bg-tss-navy text-white"
                    : "border border-tss-border bg-white text-tss-slate hover:bg-tss-steel-soft"
                }`}
              >
                {s === "ALL" ? "All" : s.replace(/_/g, " ")}
              </Link>
            );
          })}
        </div>
      </div>

      <Panel>
        {enquiries.length === 0 ? (
          <EmptyState title="No enquiries" description="Create an enquiry to start the workflow." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-tss-steel-soft/50 text-left text-xs uppercase tracking-wide text-tss-slate">
              <tr>
                <th className="px-4 py-2">Number</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Vessel / subject</th>
                <th className="px-4 py-2">Owner</th>
                <th className="px-4 py-2">Lines</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((e) => (
                <tr key={e.id} className="border-t border-tss-border/70 hover:bg-tss-steel-soft/30">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/enquiries/${e.id}`}
                      className="font-medium text-tss-steel hover:underline"
                    >
                      {e.number}
                    </Link>
                    {e.priority === "URGENT" ? (
                      <Badge tone="danger" className="ml-1.5">
                        Urgent
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/customers/${e.customerId}`}
                      className="hover:underline"
                    >
                      {e.customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <div>{e.vesselName || "—"}</div>
                    <div className="text-xs text-tss-slate">
                      {e.subject || ""}
                      {e.deliveryPort ? ` · ${e.deliveryPort}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-tss-slate">{e.owner?.name || "—"}</td>
                  <td className="px-4 py-2.5">
                    {e._count.lines}
                    <span className="text-xs text-tss-slate"> / {e._count.rfqs} RFQ</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="px-4 py-2.5 text-tss-slate">{formatDate(e.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
