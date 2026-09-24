import { PageHeader, Panel } from "@/components/ui/panel";
import { getMarginReports } from "@/lib/reports";
import { formatMoney } from "@/lib/utils";

function ReportTable({
  title,
  rows,
  showPo,
}: {
  title: string;
  rows: Awaited<ReturnType<typeof getMarginReports>>["byCustomer"];
  showPo?: boolean;
}) {
  return (
    <Panel>
      <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-tss-steel-soft/40 text-left text-xs uppercase text-tss-slate">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Enquiries</th>
              <th className="px-4 py-2">Quotes</th>
              <th className="px-4 py-2">Revenue</th>
              <th className="px-4 py-2">Cost</th>
              <th className="px-4 py-2">Margin</th>
              <th className="px-4 py-2">Margin %</th>
              {showPo ? <th className="px-4 py-2">POs</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-tss-border/70">
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-4 py-2.5">{r.enquiries}</td>
                <td className="px-4 py-2.5">{r.quoteCount}</td>
                <td className="px-4 py-2.5">{formatMoney(r.quoteRevenue)}</td>
                <td className="px-4 py-2.5">{formatMoney(r.costTotal)}</td>
                <td className="px-4 py-2.5 font-medium">{formatMoney(r.margin)}</td>
                <td className="px-4 py-2.5">{r.marginPct.toFixed(1)}%</td>
                {showPo ? <td className="px-4 py-2.5">{r.poCount}</td> : null}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showPo ? 8 : 7} className="px-4 py-6 text-tss-slate">
                  No data yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default async function ReportsPage() {
  const report = await getMarginReports();

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Margin and volume by customer, vessel, supplier, and delivery port."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Open enquiries", value: String(report.kpis.openEnquiries) },
          { label: "Quotes (sent/approved)", value: String(report.kpis.quoteCount) },
          {
            label: "Quote revenue",
            value: formatMoney(report.kpis.totalQuoteRevenue),
          },
          {
            label: "Avg margin",
            value: `${report.kpis.avgMarginPct.toFixed(1)}%`,
          },
        ].map((k) => (
          <Panel key={k.label} className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-tss-slate">
              {k.label}
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-tss-navy">
              {k.value}
            </div>
          </Panel>
        ))}
      </div>

      <div className="space-y-6">
        <ReportTable title="By customer" rows={report.byCustomer} />
        <ReportTable title="By vessel" rows={report.byVessel} />
        <ReportTable title="By supplier" rows={report.bySupplier} showPo />
        <ReportTable title="By delivery port" rows={report.byPort} showPo />
      </div>
    </div>
  );
}
