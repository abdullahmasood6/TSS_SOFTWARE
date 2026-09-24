"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPurchaseOrder,
  createSupplierPurchase,
  completeEnquiry,
} from "@/app/actions/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/ui/panel";
import { decimalToNumber, formatMoney } from "@/lib/utils";

type Line = {
  id: string;
  partId: string | null;
  partNumber: string;
  description: string;
  quantity: unknown;
};

type SupplierOption = {
  id: string;
  name: string;
  costs: Record<string, number>;
};

export function OrdersPanel({
  enquiryId,
  lines,
  suppliers,
}: {
  enquiryId: string;
  lines: Line[];
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [error, setError] = useState("");

  function onPo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("enquiryId", enquiryId);
    startTransition(async () => {
      try {
        await createPurchaseOrder(fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function onPurchase() {
    setError("");
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return;
    const fd = new FormData();
    fd.set("enquiryId", enquiryId);
    fd.set("supplierId", supplierId);
    fd.set(
      "lines",
      JSON.stringify(
        lines.map((l) => ({
          enquiryLineId: l.id,
          partId: l.partId,
          partNumber: l.partNumber,
          description: l.description,
          quantity: decimalToNumber(l.quantity as never),
          unitCost: supplier.costs[l.id] ?? 0,
        }))
      )
    );
    startTransition(async () => {
      try {
        await createSupplierPurchase(fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-tss-navy">Customer purchase order</h3>
        <form onSubmit={onPo} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Customer PO reference</Label>
            <Input name="customerPoRef" required placeholder="PO-…" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Notes</Label>
            <Textarea name="notes" rows={2} />
          </div>
          <Button type="submit" disabled={pending}>
            Record customer PO
          </Button>
        </form>
      </Panel>

      <Panel className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-tss-navy">Send purchase to supplier</h3>
        <div className="mb-3 space-y-1">
          <Label>Supplier</Label>
          <select
            className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3 space-y-1 text-sm">
          {lines.map((l) => {
            const cost = suppliers.find((s) => s.id === supplierId)?.costs[l.id] ?? 0;
            return (
              <div key={l.id} className="flex justify-between border-b border-tss-border/60 py-1">
                <span>
                  {l.partNumber} × {decimalToNumber(l.quantity as never)}
                </span>
                <span>{formatMoney(cost)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onPurchase} disabled={pending || !supplierId}>
            Create supplier purchase
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await completeEnquiry(enquiryId);
                router.refresh();
              })
            }
          >
            Mark completed
          </Button>
        </div>
      </Panel>
      {error ? <p className="text-sm text-tss-danger">{error}</p> : null}
    </div>
  );
}
