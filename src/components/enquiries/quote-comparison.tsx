import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { decimalToNumber, formatMoney, cn } from "@/lib/utils";

type Line = {
  id: string;
  partNumber: string;
  description: string;
  quantity: unknown;
};

type QuoteLine = {
  enquiryLineId: string;
  unitCost: unknown;
  currency: string;
  leadTimeDays?: number | null;
  supplierQuote: {
    leadTimeDays?: number | null;
    supplier: { id: string; name: string };
  };
};

export function QuoteComparison({
  lines,
  supplierQuoteLines,
}: {
  lines: Line[];
  supplierQuoteLines: QuoteLine[];
}) {
  const suppliers = Array.from(
    new Map(
      supplierQuoteLines.map((l) => [
        l.supplierQuote.supplier.id,
        l.supplierQuote.supplier,
      ])
    ).values()
  );

  if (suppliers.length === 0) return null;

  function costFor(lineId: string, supplierId: string) {
    return supplierQuoteLines.find(
      (l) =>
        l.enquiryLineId === lineId && l.supplierQuote.supplier.id === supplierId
    );
  }

  return (
    <Panel className="overflow-x-auto">
      <div className="border-b border-tss-border px-4 py-3">
        <h3 className="text-sm font-semibold text-tss-navy">
          Supplier quote comparison
        </h3>
        <p className="text-xs text-tss-slate">
          Side-by-side unit costs — lowest per line is highlighted.
        </p>
      </div>
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-tss-steel-soft/50 text-left text-xs uppercase text-tss-slate">
          <tr>
            <th className="px-3 py-2">Part</th>
            <th className="px-3 py-2">Qty</th>
            {suppliers.map((s) => (
              <th key={s.id} className="px-3 py-2">
                {s.name}
              </th>
            ))}
            <th className="px-3 py-2">Best</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const costs = suppliers.map((s) => {
              const row = costFor(line.id, s.id);
              return {
                supplierId: s.id,
                name: s.name,
                cost: row ? decimalToNumber(row.unitCost as never) : null,
                currency: row?.currency || "USD",
                lead:
                  row?.leadTimeDays ??
                  row?.supplierQuote.leadTimeDays ??
                  null,
              };
            });
            const available = costs.filter((c) => c.cost != null) as {
              supplierId: string;
              name: string;
              cost: number;
              currency: string;
              lead: number | null;
            }[];
            const best =
              available.length > 0
                ? available.reduce((a, b) => (a.cost <= b.cost ? a : b))
                : null;

            return (
              <tr key={line.id} className="border-t border-tss-border/70">
                <td className="px-3 py-2.5">
                  <div className="font-mono text-xs font-semibold">{line.partNumber}</div>
                  <div className="text-xs text-tss-slate">{line.description}</div>
                </td>
                <td className="px-3 py-2.5">
                  {decimalToNumber(line.quantity as never)}
                </td>
                {costs.map((c) => (
                  <td
                    key={c.supplierId}
                    className={cn(
                      "px-3 py-2.5",
                      best && c.cost === best.cost
                        ? "bg-emerald-50 font-semibold text-tss-success"
                        : ""
                    )}
                  >
                    {c.cost != null ? (
                      <div>
                        {formatMoney(c.cost, c.currency)}
                        {c.lead != null ? (
                          <div className="text-[11px] font-normal text-tss-slate">
                            {c.lead}d lead
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-tss-slate">—</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-2.5">
                  {best ? (
                    <div>
                      <Badge tone="success">{formatMoney(best.cost, best.currency)}</Badge>
                      <div className="mt-1 text-[11px] text-tss-slate">{best.name}</div>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
