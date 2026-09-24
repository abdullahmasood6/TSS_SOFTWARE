"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCustomerQuote } from "@/app/actions/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/ui/panel";
import { RoleNotice } from "@/components/ui/role-notice";
import { decimalToNumber, formatMoney } from "@/lib/utils";

type Line = {
  id: string;
  partNumber: string;
  description: string;
  quantity: unknown;
  unitSell: unknown;
  previousSellPrice: unknown | null;
  underquoteReason: string | null;
  currency: string;
};

export function QuoteEditor({
  quoteId,
  status,
  notes,
  marginPct,
  lines,
  canEdit = true,
}: {
  quoteId: string;
  status: string;
  notes: string | null;
  marginPct: number;
  lines: Line[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [margin, setMargin] = useState(marginPct);
  const [note, setNote] = useState(notes || "");
  const [sells, setSells] = useState<Record<string, number>>(
    Object.fromEntries(lines.map((l) => [l.id, decimalToNumber(l.unitSell as never)]))
  );
  const [reasons, setReasons] = useState<Record<string, string>>(
    Object.fromEntries(lines.map((l) => [l.id, l.underquoteReason || ""]))
  );

  if (!["DRAFT", "SENT"].includes(status)) return null;

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fd = new FormData();
    fd.set("notes", note);
    fd.set("marginPct", String(margin));
    fd.set(
      "lines",
      JSON.stringify(
        lines.map((l) => ({
          id: l.id,
          unitSell: sells[l.id],
          underquoteReason: reasons[l.id] || null,
        }))
      )
    );
    startTransition(async () => {
      try {
        await updateCustomerQuote(quoteId, fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  if (!canEdit) {
    return (
      <Panel className="mb-4 p-4">
        <RoleNotice message="Sales can edit draft quote prices. Your role is view-only." />
      </Panel>
    );
  }

  return (
    <Panel className="mb-4 p-4">
      <h3 className="mb-3 text-sm font-semibold text-tss-navy">Edit quote</h3>
      <form onSubmit={onSave} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Margin %</Label>
            <Input
              type="number"
              step="any"
              value={margin}
              onChange={(e) => setMargin(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        {lines.map((l) => {
          const prev =
            l.previousSellPrice != null
              ? decimalToNumber(l.previousSellPrice as never)
              : null;
          const sell = sells[l.id] ?? 0;
          const under = prev != null && sell <= prev;
          return (
            <div key={l.id} className="rounded border border-tss-border/80 p-3">
              <div className="mb-2 flex justify-between text-sm">
                <div>
                  <span className="font-mono text-xs">{l.partNumber}</span> — {l.description}
                </div>
                {prev != null ? (
                  <span className="text-xs text-tss-slate">
                    Prior sell {formatMoney(prev, l.currency)}
                  </span>
                ) : null}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Unit sell</Label>
                  <Input
                    type="number"
                    step="any"
                    value={sell}
                    className={under ? "border-tss-danger" : ""}
                    onChange={(e) =>
                      setSells((p) => ({
                        ...p,
                        [l.id]: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                {under ? (
                  <div className="space-y-1">
                    <Label>Under-quote reason</Label>
                    <Textarea
                      rows={2}
                      value={reasons[l.id] || ""}
                      onChange={(e) =>
                        setReasons((p) => ({ ...p, [l.id]: e.target.value }))
                      }
                      required
                    />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        {error ? <p className="text-sm text-tss-danger">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save quote changes"}
        </Button>
      </form>
    </Panel>
  );
}
