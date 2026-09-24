"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendRfqs, logSupplierQuote } from "@/app/actions/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { decimalToNumber, formatMoney } from "@/lib/utils";
import { rankSuppliers, type RecommendSupplier } from "@/lib/recommend";

type EnquiryLine = {
  id: string;
  partId: string | null;
  partNumber: string;
  description: string;
  brand?: string | null;
  quantity: unknown;
};
type Rfq = {
  id: string;
  number: string;
  status: string;
  supplier: { id: string; name: string };
  quotes: {
    id: string;
    number: string | null;
    lines: {
      enquiryLineId: string;
      unitCost: unknown;
      currency: string;
    }[];
  }[];
};

export function RfqPanel({
  enquiryId,
  suppliers,
  lines,
  rfqs,
  deliveryPort,
  category,
}: {
  enquiryId: string;
  suppliers: RecommendSupplier[];
  lines: EnquiryLine[];
  rfqs: Rfq[];
  deliveryPort?: string | null;
  category?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [activeRfq, setActiveRfq] = useState<string>(rfqs[0]?.id || "");
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  const ranked = useMemo(
    () =>
      rankSuppliers(suppliers, {
        deliveryPort,
        category,
        brands: lines.map((l) => l.brand || "").filter(Boolean) as string[],
        alreadySentIds: rfqs.map((r) => r.supplier.id),
      }),
    [suppliers, deliveryPort, category, lines, rfqs]
  );

  const topIds = ranked.slice(0, 3).map((r) => r.supplier.id);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectRecommended() {
    setSelected(topIds);
  }

  function send() {
    setError("");
    startTransition(async () => {
      try {
        await sendRfqs(enquiryId, selected);
        setSelected([]);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function saveQuote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const rfq = rfqs.find((r) => r.id === activeRfq);
    if (!rfq) return;

    fd.set("rfqId", activeRfq);
    fd.set(
      "lines",
      JSON.stringify(
        lines.map((l) => ({
          enquiryLineId: l.id,
          partId: l.partId,
          partNumber: l.partNumber,
          description: l.description,
          quantity: decimalToNumber(l.quantity as never),
          unitCost: costs[l.id] ?? 0,
        }))
      )
    );

    startTransition(async () => {
      try {
        await logSupplierQuote(fd);
        setCosts({});
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-tss-navy">Send RFQs to suppliers</h3>
          <Button type="button" size="sm" variant="outline" onClick={selectRecommended} disabled={!topIds.length}>
            Select top recommended
          </Button>
        </div>
        {deliveryPort || category ? (
          <p className="mb-3 text-xs text-tss-slate">
            Ranking by port {deliveryPort || "—"} · category {category || "—"} · KYC · lead time ·
            brands (rule-based)
          </p>
        ) : null}
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {ranked.map(({ supplier: s, score, reasons }) => (
            <label
              key={s.id}
              className="flex items-start gap-2 rounded-md border border-tss-border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.includes(s.id)}
                onChange={() => toggle(s.id)}
                disabled={s.kycStatus === "BLOCKED" || s.complianceHold}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{s.name}</span>
                  {topIds.includes(s.id) ? <Badge tone="success">Recommended</Badge> : null}
                  <Badge tone={s.kycStatus === "CLEAR" ? "success" : "warning"}>
                    {s.kycStatus}
                  </Badge>
                  <Badge tone="info">Score {score}</Badge>
                </span>
                <span className="mt-0.5 block text-[11px] text-tss-slate">
                  {reasons.slice(0, 3).join(" · ") || "No strong match"}
                </span>
              </span>
            </label>
          ))}
        </div>
        <Button type="button" onClick={send} disabled={pending || selected.length === 0}>
          Record RFQs sent
        </Button>
      </Panel>

      {rfqs.length > 0 ? (
        <Panel className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-tss-navy">Log supplier prices</h3>
          <form onSubmit={saveQuote} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>RFQ</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
                  value={activeRfq}
                  onChange={(e) => setActiveRfq(e.target.value)}
                >
                  {rfqs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.number} — {r.supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Supplier quote ref</Label>
                <Input name="supplierRef" />
              </div>
              <div className="space-y-1">
                <Label>Lead time (days)</Label>
                <Input name="leadTimeDays" type="number" min={0} />
              </div>
            </div>
            <input type="hidden" name="currency" value="USD" />
            <div className="space-y-2">
              {lines.map((l) => (
                <div
                  key={l.id}
                  className="grid items-center gap-2 rounded border border-tss-border/70 px-3 py-2 md:grid-cols-[1fr_2fr_1fr]"
                >
                  <div className="font-mono text-xs">{l.partNumber}</div>
                  <div className="text-sm text-tss-slate">{l.description}</div>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    placeholder="Unit cost"
                    value={costs[l.id] ?? ""}
                    onChange={(e) =>
                      setCosts((prev) => ({
                        ...prev,
                        [l.id]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    required
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea name="notes" rows={2} />
            </div>
            <Button type="submit" disabled={pending}>
              Save supplier quote
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            {rfqs.map((r) => (
              <div key={r.id} className="rounded-md border border-tss-border/80 p-3 text-sm">
                <div className="font-medium">
                  {r.number} · {r.supplier.name} · {r.status}
                </div>
                {r.quotes.map((q) => (
                  <div key={q.id} className="mt-2 text-xs text-tss-slate">
                    Quote {q.number || "—"}:{" "}
                    {q.lines
                      .map((l) =>
                        formatMoney(decimalToNumber(l.unitCost as never), l.currency)
                      )
                      .join(" · ")}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {error ? <p className="text-sm text-tss-danger">{error}</p> : null}
    </div>
  );
}
