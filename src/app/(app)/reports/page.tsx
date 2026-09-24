import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui/panel";
import { getMarginReports } from "@/lib/reports";
import { formatMoney } from "@/lib/utils";
import { statusLabel } from "@/lib/status";
import { BarChart, FunnelChart, TrendChart } from "@/components/reports/charts";
import { Button } from "@/components/ui/button";
import type { EnquiryStatus } from "@prisma/client";

function ReportTable({
  title,
  rows,
  showPo,
  nameHref,
}: {
  title: string;
  rows: Awaited<ReturnType<typeof getMarginReports>>["byCustomer"];
  showPo?: boolean;
  nameHref?: (id: string) => string;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="tss-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Enquiries</th>
              <th>Quotes</th>
              <th>Revenue</th>
              <th>Cost</th>
              <th>Margin</th>
              <th>Margin %</th>
              {showPo ? <th>POs</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">
                  {nameHref ? (
                    <Link href={nameHref(r.id)} className="text-tss-steel hover:underline">
                      {r.name}
                    </Link>
                  ) : (
                    r.name
                  )}
                </td>
                <td>{r.enquiries}</td>
                <td>{r.quoteCount}</td>
                <td>{formatMoney(r.quoteRevenue)}</td>
                <td>{formatMoney(r.costTotal)}</td>
                <td className="font-medium">{formatMoney(r.margin)}</td>
                <td>{r.marginPct.toFixed(1)}%</td>
                {showPo ? <td>{r.poCount}</td> : null}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showPo ? 8 : 7} className="!py-8 text-center text-tss-slate">
                  No data yet for this range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function parseDate(value?: string, endOfDay = false) {
  if (!value) return undefined;
  const d = new Date(value + (endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; range?: string }>;
}) {
  const sp = await searchParams;

  const today = new Date();
  const defaultFrom = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 7, 1)
  );
  const preset = sp.range || "8m";

  let from = parseDate(sp.from);
  let to = parseDate(sp.to, true);

  if (!sp.from && !sp.to) {
    if (preset === "3m") {
      from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 2, 1));
    } else if (preset === "12m") {
      from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));
    } else if (preset === "ytd") {
      from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
    } else {
      from = defaultFrom;
    }
    to = today;
  }

  const report = await getMarginReports({ from, to });
  const forecastOnly = report.forecast.filter((f) => f.isForecast);

  const fromStr = from ? from.toISOString().slice(0, 10) : "";
  const toStr = to ? to.toISOString().slice(0, 10) : "";

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Reports & forecast"
        description="Margin analytics, spend mix, pipeline funnel, and a 3-month outlook from recent trends."
      />

      <Panel className="mb-5 p-4">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
              From
            </label>
            <input
              type="date"
              name="from"
              defaultValue={fromStr}
              className="flex h-9 rounded-md border border-tss-border bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tss-slate">
              To
            </label>
            <input
              type="date"
              name="to"
              defaultValue={toStr}
              className="flex h-9 rounded-md border border-tss-border bg-white px-3 text-sm"
            />
          </div>
          <Button type="submit">Apply range</Button>
          <div className="flex flex-wrap gap-1 pb-0.5">
            {[
              { id: "3m", label: "3 months" },
              { id: "8m", label: "8 months" },
              { id: "12m", label: "12 months" },
              { id: "ytd", label: "YTD" },
            ].map((r) => (
              <Link
                key={r.id}
                href={`/reports?range=${r.id}`}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  preset === r.id && !sp.from
                    ? "bg-tss-navy text-white"
                    : "border border-tss-border bg-white text-tss-slate hover:bg-tss-steel-soft"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </form>
      </Panel>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Quote revenue",
            value: formatMoney(report.kpis.totalQuoteRevenue),
            hint: `${report.kpis.quoteCount} sent/approved quotes`,
          },
          {
            label: "Gross margin",
            value: formatMoney(report.kpis.totalMargin),
            hint: `${report.kpis.avgMarginPct.toFixed(1)}% average`,
          },
          {
            label: "Purchase spend",
            value: formatMoney(report.kpis.totalPurchaseSpend),
            hint: "Supplier PO cost in range",
          },
          {
            label: "3-mo revenue outlook",
            value: formatMoney(report.kpis.forecastRevenue),
            hint: `Margin outlook ${formatMoney(report.kpis.forecastMargin)}`,
          },
        ].map((k) => (
          <Panel key={k.label} className="tss-kpi p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-tss-slate">
              {k.label}
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-tss-navy">
              {k.value}
            </div>
            <div className="mt-1 text-xs text-tss-slate">{k.hint}</div>
          </Panel>
        ))}
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <TrendChart
            title="Revenue, cost & margin trend"
            subtitle="Solid months are actuals; italic labels after the dashed line are forecast."
            series={report.forecast}
          />
        </div>
        <div className="xl:col-span-2">
          <Panel className="h-full p-4">
            <h3 className="text-sm font-semibold text-tss-navy">3-month forecast</h3>
            <p className="mt-1 text-xs text-tss-slate">
              Blend of linear trend and recent month-over-month momentum (not a guarantee).
            </p>
            <ul className="mt-4 space-y-3">
              {forecastOnly.map((f) => (
                <li
                  key={f.key}
                  className="rounded-lg border border-tss-steel/20 bg-tss-steel-soft/40 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-tss-navy">{f.label}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-tss-steel">
                      Outlook
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-tss-slate">Revenue</div>
                      <div className="font-medium text-tss-ink">{formatMoney(f.revenue)}</div>
                    </div>
                    <div>
                      <div className="text-tss-slate">Cost</div>
                      <div className="font-medium text-tss-ink">{formatMoney(f.cost)}</div>
                    </div>
                    <div>
                      <div className="text-tss-slate">Margin</div>
                      <div className="font-medium text-tss-success">{formatMoney(f.margin)}</div>
                    </div>
                  </div>
                </li>
              ))}
              {forecastOnly.length === 0 ? (
                <li className="text-sm text-tss-slate">Need more history to forecast.</li>
              ) : null}
            </ul>
            <div className="mt-4 rounded-md border border-tss-border bg-tss-surface/80 px-3 py-2 text-[11px] leading-relaxed text-tss-slate">
              Open enquiries: <strong className="text-tss-navy">{report.kpis.openEnquiries}</strong>
              {" · "}
              Enquiries in range:{" "}
              <strong className="text-tss-navy">{report.kpis.enquiryCount}</strong>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <BarChart
          title="Top customers by revenue"
          subtitle="Sent / approved quote revenue"
          items={report.byCustomer.slice(0, 8).map((r) => ({
            label: r.name,
            value: r.quoteRevenue,
            tone: "steel" as const,
          }))}
        />
        <BarChart
          title="Top suppliers by spend"
          subtitle="Purchase order cost"
          items={report.bySupplier.slice(0, 8).map((r) => ({
            label: r.name,
            value: r.costTotal,
            tone: "navy" as const,
          }))}
        />
        <FunnelChart
          title="Enquiry pipeline (by status)"
          items={report.pipeline.map((p) => ({
            label: statusLabel(p.status as EnquiryStatus),
            count: p.count,
          }))}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <BarChart
          title="Spend by delivery port"
          items={report.byPort.slice(0, 8).map((r) => ({
            label: r.name,
            value: r.costTotal,
            tone: "warn" as const,
          }))}
        />
        <BarChart
          title="Margin % by vessel"
          subtitle="Where sell vs cost is strongest"
          valueFormat="percent"
          items={report.byVessel
            .filter((r) => r.quoteRevenue > 0)
            .slice(0, 8)
            .map((r) => ({
              label: r.name,
              value: r.marginPct,
              tone: "success" as const,
            }))}
        />
      </div>

      <div className="space-y-6">
        <ReportTable
          title="By customer"
          rows={report.byCustomer}
          nameHref={(id) => `/customers/${id}`}
        />
        <ReportTable title="By vessel" rows={report.byVessel} />
        <ReportTable
          title="By supplier"
          rows={report.bySupplier}
          showPo
          nameHref={(id) => `/suppliers/${id}`}
        />
        <ReportTable title="By delivery port" rows={report.byPort} showPo />
      </div>
    </div>
  );
}
