"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomerQuote, getPriceIntelAction } from "@/app/actions/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { decimalToNumber, formatMoney, formatDate } from "@/lib/utils";

type Line = {
  id: string;
  partId: string | null;
  partNumber: string;
  description: string;
  quantity: unknown;
};

type SupplierQuoteLine = {
  id: string;
  enquiryLineId: string;
  unitCost: unknown;
  currency: string;
  supplierQuote: {
    supplier: { id: string; name: string };
  };
};

type Intel = {
  partNumber: string;
  lastSellPrice: number | null;
  lastSellDate: Date | null;
  bestSellPrice: number | null;
  lastCost: number | null;
  avgSellPrice: number | null;
};

export function QuoteBuilder({
  enquiryId,
  lines,
  supplierQuoteLines,
  defaultMargin,
}: {
  enquiryId: string;
  lines: Line[];
  supplierQuoteLines: SupplierQuoteLine[];
  defaultMargin: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [margin, setMargin] = useState(defaultMargin);
  const [error, setError] = useState("");
  const [underquoteNote, setUnderquoteNote] = useState("");
  const [intel, setIntel] = useState<Record<string, Intel>>({});
  const [selectedCost, setSelectedCost] = useState<Record<string, string>>({});
  const [sellPrices, setSellPrices] = useState<Record<string, number>>({});

  const optionsByLine = useMemo(() => {
    const map: Record<string, SupplierQuoteLine[]> = {};
    for (const sql of supplierQuoteLines) {
      map[sql.enquiryLineId] = map[sql.enquiryLineId] || [];
      map[sql.enquiryLineId].push(sql);
    }
    return map;
  }, [supplierQuoteLines]);

  useEffect(() => {
    const initials: Record<string, string> = {};
    const sells: Record<string, number> = {};
    for (const line of lines) {
      const opts = optionsByLine[line.id] || [];
      const best = opts
        .slice()
        .sort(
          (a, b) =>
            decimalToNumber(a.unitCost as never) - decimalToNumber(b.unitCost as never)
        )[0];
      if (best) {
        initials[line.id] = best.id;
        const cost = decimalToNumber(best.unitCost as never);
        sells[line.id] = Math.round(cost * (1 + margin / 100) * 10000) / 10000;
      }
    }
    setSelectedCost(initials);
    setSellPrices(sells);
  }, [lines, optionsByLine, margin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries: Record<string, Intel> = {};
      for (const line of lines) {
        const data = await getPriceIntelAction(line.partNumber);
        entries[line.partNumber] = data as Intel;
      }
      if (!cancelled) setIntel(entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [lines]);

  function costFor(lineId: string) {
    const opt = (optionsByLine[lineId] || []).find((o) => o.id === selectedCost[lineId]);
    return opt ? decimalToNumber(opt.unitCost as never) : 0;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("enquiryId", enquiryId);
    fd.set("marginPct", String(margin));
    fd.set("underquoteNote", underquoteNote);

    const payload = lines.map((l) => {
      const unitCost = costFor(l.id);
      const unitSell = sellPrices[l.id] ?? unitCost;
      const prev = intel[l.partNumber]?.lastSellPrice ?? null;
      const under = prev != null && unitSell <= prev;
      return {
        enquiryLineId: l.id,
        partId: l.partId,
        partNumber: l.partNumber,
        description: l.description,
        quantity: decimalToNumber(l.quantity as never),
        unitCost,
        unitSell,
        supplierQuoteLineId: selectedCost[l.id],
        underquoteReason: under ? underquoteNote : undefined,
      };
    });
    fd.set("lines", JSON.stringify(payload));

    startTransition(async () => {
      try {
        const id = await createCustomerQuote(fd);
        router.push(`/quotes/${id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create quote");
      }
    });
  }

  const hasUnderquote = lines.some((l) => {
    const prev = intel[l.partNumber]?.lastSellPrice;
    const sell = sellPrices[l.id];
    return prev != null && sell != null && sell <= prev;
  });

  return (
    <Panel className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-tss-navy">Build customer quote</h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Default margin %</Label>
            <Input
              type="number"
              step="any"
              value={margin}
              onChange={(e) => setMargin(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input name="notes" placeholder="Internal / customer notes" />
          </div>
        </div>

        <div className="space-y-3">
          {lines.map((line) => {
            const opts = optionsByLine[line.id] || [];
            const info = intel[line.partNumber];
            const sell = sellPrices[line.id] ?? 0;
            const under =
              info?.lastSellPrice != null && sell <= info.lastSellPrice;

            return (
              <div
                key={line.id}
                className="rounded-md border border-tss-border bg-tss-surface/50 p-3"
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs font-semibold">{line.partNumber}</div>
                    <div className="text-sm">{line.description}</div>
                  </div>
                  {info?.lastSellPrice != null ? (
                    <div className="text-right text-xs">
                      <Badge tone={under ? "danger" : "info"}>
                        Last sell {formatMoney(info.lastSellPrice)}
                      </Badge>
                      <div className="mt-1 text-tss-slate">
                        {info.lastSellDate ? formatDate(info.lastSellDate) : ""}
                        {info.bestSellPrice != null
                          ? ` · Best ${formatMoney(info.bestSellPrice)}`
                          : ""}
                      </div>
                    </div>
                  ) : (
                    <Badge tone="neutral">No prior sell price</Badge>
                  )}
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Supplier cost</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-tss-border bg-white px-2 text-sm"
                      value={selectedCost[line.id] || ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedCost((p) => ({ ...p, [line.id]: id }));
                        const opt = opts.find((o) => o.id === id);
                        if (opt) {
                          const cost = decimalToNumber(opt.unitCost as never);
                          setSellPrices((p) => ({
                            ...p,
                            [line.id]:
                              Math.round(cost * (1 + margin / 100) * 10000) / 10000,
                          }));
                        }
                      }}
                    >
                      {opts.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.supplierQuote.supplier.name} —{" "}
                          {formatMoney(
                            decimalToNumber(o.unitCost as never),
                            o.currency
                          )}
                        </option>
                      ))}
                      {opts.length === 0 ? (
                        <option value="">No supplier quotes</option>
                      ) : null}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Unit sell price</Label>
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      value={sell}
                      onChange={(e) =>
                        setSellPrices((p) => ({
                          ...p,
                          [line.id]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className={under ? "border-tss-danger ring-1 ring-tss-danger/30" : ""}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Line total</Label>
                    <div className="flex h-9 items-center rounded-md border border-tss-border bg-white px-3 text-sm font-medium">
                      {formatMoney(sell * decimalToNumber(line.quantity as never))}
                    </div>
                  </div>
                </div>
                {under ? (
                  <p className="mt-2 text-xs text-tss-danger">
                    Proposed sell is at or below previous quote of{" "}
                    {formatMoney(info!.lastSellPrice!)}. Provide a reason below to proceed.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {hasUnderquote ? (
          <div className="space-y-1">
            <Label>Under-quote reason (required)</Label>
            <Textarea
              value={underquoteNote}
              onChange={(e) => setUnderquoteNote(e.target.value)}
              required
              placeholder="Why are we quoting at or below the previous price?"
            />
          </div>
        ) : null}

        {error ? <p className="text-sm text-tss-danger">{error}</p> : null}
        <Button type="submit" disabled={pending || lines.length === 0}>
          {pending ? "Creating…" : "Create customer quote"}
        </Button>
      </form>
    </Panel>
  );
}
