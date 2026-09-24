"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createGoodsReceipt,
  createSupplierInvoice,
  rematchInvoice,
} from "@/app/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { formatMoney, decimalToNumber, formatDate } from "@/lib/utils";

type PurchaseOption = {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  currency: string;
  deliveryPort: string | null;
  lines: {
    id: string;
    partNumber: string;
    description: string;
    quantity: unknown;
    unitCost: unknown;
  }[];
  receipts: { id: string; number: string }[];
};

type InvoiceRow = {
  id: string;
  number: string;
  supplierInvRef: string | null;
  supplier: { name: string };
  purchase: { number: string } | null;
  totalAmount: unknown;
  currency: string;
  matchStatus: string;
  matchNotes: string | null;
  status: string;
  invoiceDate: Date | string;
};

function matchTone(status: string): "success" | "warning" | "danger" | "neutral" | "info" {
  if (status === "MATCHED") return "success";
  if (status === "PARTIAL") return "warning";
  if (status === "EXCEPTION") return "danger";
  return "neutral";
}

export function InvoicesManager({
  purchases,
  invoices,
  suppliers,
}: {
  purchases: PurchaseOption[];
  invoices: InvoiceRow[];
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [purchaseId, setPurchaseId] = useState(purchases[0]?.id || "");
  const [error, setError] = useState("");
  const purchase = purchases.find((p) => p.id === purchaseId);

  function receiveGoods() {
    if (!purchase) return;
    setError("");
    const fd = new FormData();
    fd.set("deliveryPort", purchase.deliveryPort || "");
    fd.set(
      "lines",
      JSON.stringify(
        purchase.lines.map((l) => ({
          purchaseLineId: l.id,
          partNumber: l.partNumber,
          description: l.description,
          orderedQty: decimalToNumber(l.quantity as never),
          receivedQty: decimalToNumber(l.quantity as never),
        }))
      )
    );
    startTransition(async () => {
      try {
        await createGoodsReceipt(purchase.id, fd);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function createInvoice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!purchase) return;
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("purchaseId", purchase.id);
    fd.set("supplierId", purchase.supplierId);
    fd.set("currency", purchase.currency);
    if (purchase.receipts[0]) fd.set("receiptId", purchase.receipts[0].id);
    fd.set(
      "lines",
      JSON.stringify(
        purchase.lines.map((l) => ({
          partNumber: l.partNumber,
          description: l.description,
          quantity: decimalToNumber(l.quantity as never),
          unitCost: decimalToNumber(l.unitCost as never),
        }))
      )
    );
    startTransition(async () => {
      try {
        await createSupplierInvoice(fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Panel className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-tss-navy">
          Goods receipt & e-invoice (SeaProc / PortProcure)
        </h3>
        <div className="mb-3 grid gap-3 md:grid-cols-2">
          <div>
            <Label>Supplier purchase</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
              value={purchaseId}
              onChange={(e) => setPurchaseId(e.target.value)}
            >
              {purchases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.number} · {p.supplierName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" disabled={pending || !purchase} onClick={receiveGoods}>
              Record goods receipt
            </Button>
          </div>
        </div>
        {purchase ? (
          <form onSubmit={createInvoice} className="grid gap-3 border-t border-tss-border pt-3 md:grid-cols-3">
            <div>
              <Label>Supplier invoice ref</Label>
              <Input name="supplierInvRef" placeholder="Vendor INV-…" className="mt-1" />
            </div>
            <div>
              <Label>Due date</Label>
              <Input name="dueDate" type="date" className="mt-1" />
            </div>
            <div>
              <Label>Tax amount</Label>
              <Input name="taxAmount" type="number" step="0.01" defaultValue="0" className="mt-1" />
            </div>
            <div className="md:col-span-3">
              <p className="mb-2 text-xs text-tss-slate">
                Receipts:{" "}
                {purchase.receipts.length
                  ? purchase.receipts.map((r) => r.number).join(", ")
                  : "none yet — create GRN first for full 3-way match"}
              </p>
              <Button type="submit" disabled={pending}>
                Create invoice & run 3-way match
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-tss-slate">No supplier purchases available.</p>
        )}
        {error ? <p className="mt-2 text-sm text-tss-danger">{error}</p> : null}
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
          Supplier invoices
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-tss-surface text-[10.5px] uppercase tracking-[0.08em] text-tss-slate">
            <tr>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Supplier</th>
              <th className="px-4 py-2">PO</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">3-way match</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-tss-border">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-tss-navy">{inv.number}</div>
                  <div className="text-xs text-tss-slate">
                    {inv.supplierInvRef || "—"} · {formatDate(inv.invoiceDate)}
                  </div>
                </td>
                <td className="px-4 py-2.5">{inv.supplier.name}</td>
                <td className="px-4 py-2.5">{inv.purchase?.number || "—"}</td>
                <td className="px-4 py-2.5">
                  {formatMoney(decimalToNumber(inv.totalAmount as never), inv.currency)}
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={matchTone(inv.matchStatus)}>{inv.matchStatus}</Badge>
                  {inv.matchNotes ? (
                    <div className="mt-1 max-w-xs text-[11px] text-tss-slate">{inv.matchNotes}</div>
                  ) : null}
                </td>
                <td className="px-4 py-2.5">{inv.status}</td>
                <td className="px-4 py-2.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await rematchInvoice(inv.id);
                        router.refresh();
                      })
                    }
                  >
                    Rematch
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 ? (
          <p className="px-4 py-6 text-sm text-tss-slate">No invoices yet.</p>
        ) : null}
      </Panel>
      {/* keep suppliers available for future free-standing invoices */}
      <span className="hidden">{suppliers.length}</span>
    </div>
  );
}
