import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/permissions";
import { PageHeader, Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; port?: string; kind?: string; category?: string }>;
}) {
  await requireSession();
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const port = sp.port?.trim() || "";
  const kind = sp.kind?.trim() || "";
  const category = sp.category?.trim() || "";

  const [suppliers, ports] = await Promise.all([
    prisma.supplier.findMany({
      where: {
        active: true,
        ...(kind === "SUPPLIER" || kind === "SERVICE_PROVIDER"
          ? { kind: kind as "SUPPLIER" | "SERVICE_PROVIDER" }
          : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
                { categories: { contains: q, mode: "insensitive" } },
                { brandsServed: { contains: q, mode: "insensitive" } },
                { portsServed: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(port ? { portsServed: { contains: port, mode: "insensitive" } } : {}),
        ...(category
          ? { categories: { contains: category, mode: "insensitive" } }
          : {}),
      },
      orderBy: [{ ratingScore: "desc" }, { name: "asc" }],
    }),
    prisma.port.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const categories = Array.from(
    new Set(
      suppliers
        .flatMap((s) => (s.categories || "").split(/[,;/|]+/))
        .map((c) => c.trim())
        .filter(Boolean)
    )
  ).sort();

  return (
    <div>
      <PageHeader
        title="Marketplace"
        description="Port-aware supplier and service-provider directory (Procureship / PortProcure style)."
      />

      <Panel className="mb-4 p-4">
        <form className="grid gap-3 md:grid-cols-4" method="get">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
              Search
            </label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, brand, category…"
              className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
              Port
            </label>
            <select
              name="port"
              defaultValue={port}
              className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            >
              <option value="">All ports</option>
              {ports.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} ({p.code})
                </option>
              ))}
              {!ports.some((p) => p.name === port) && port ? (
                <option value={port}>{port}</option>
              ) : null}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
              Kind
            </label>
            <select
              name="kind"
              defaultValue={kind}
              className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            >
              <option value="">All</option>
              <option value="SUPPLIER">Parts suppliers</option>
              <option value="SERVICE_PROVIDER">Service providers</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
              Category
            </label>
            <select
              name="category"
              defaultValue={category}
              className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-9 rounded-md bg-tss-navy px-4 text-sm font-semibold text-white md:w-fit"
          >
            Apply filters
          </button>
        </form>
      </Panel>

      {suppliers.length === 0 ? (
        <EmptyState title="No vendors match" description="Try another port or category." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s) => (
            <Link
              key={s.id}
              href={`/suppliers/${s.id}`}
              className="rounded-xl border border-tss-border bg-white p-4 transition hover:border-tss-steel/40 hover:shadow-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-tss-navy">{s.name}</div>
                  <div className="text-xs text-tss-slate">{s.code || "—"} · {s.country || "—"}</div>
                </div>
                <Badge tone={s.kind === "SERVICE_PROVIDER" ? "info" : "neutral"}>
                  {s.kind === "SERVICE_PROVIDER" ? "Service" : "Supplier"}
                </Badge>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                <Badge
                  tone={
                    s.kycStatus === "CLEAR"
                      ? "success"
                      : s.kycStatus === "BLOCKED"
                        ? "danger"
                        : "warning"
                  }
                >
                  KYC {s.kycStatus}
                </Badge>
                {s.complianceHold ? <Badge tone="danger">Hold</Badge> : null}
                {s.ratingScore != null ? (
                  <Badge tone="info">★ {Number(s.ratingScore).toFixed(1)}</Badge>
                ) : null}
              </div>
              <p className="text-xs text-tss-slate">
                <span className="font-medium text-tss-ink">Ports:</span>{" "}
                {s.portsServed || "—"}
              </p>
              <p className="mt-1 text-xs text-tss-slate">
                <span className="font-medium text-tss-ink">Categories:</span>{" "}
                {s.categories || "—"}
              </p>
              <p className="mt-1 text-xs text-tss-slate">
                Lead {s.leadTimeDays != null ? `${s.leadTimeDays}d` : "—"} · Terms{" "}
                {s.paymentTermsDays != null ? `${s.paymentTermsDays}d` : "—"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
