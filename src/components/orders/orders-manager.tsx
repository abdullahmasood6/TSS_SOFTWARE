"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePurchaseOrderNotes } from "@/app/actions/workflow";
import { updateShipment } from "@/app/actions/vessels-shipments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { RoleNotice } from "@/components/ui/role-notice";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, decimalToNumber } from "@/lib/utils";
import Link from "next/link";

type Po = {
  id: string;
  number: string;
  customerPoRef: string | null;
  notes: string | null;
  receivedAt: Date;
  enquiryId: string;
  customer: { name: string };
  enquiry: { number: string };
};

type Purchase = {
  id: string;
  number: string;
  status: string;
  currency: string;
  sentAt: Date | null;
  trackingNo: string | null;
  carrier: string | null;
  etd: Date | null;
  eta: Date | null;
  deliveryPort: string | null;
  supplier: { name: string };
  enquiry: { number: string };
  enquiryId: string;
  lines: { quantity: unknown; unitCost: unknown }[];
};

function toInputDate(d: Date | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function OrdersManager({
  purchaseOrders,
  purchases,
  canEditPo = false,
  canEditPurchase = false,
}: {
  purchaseOrders: Po[];
  purchases: Purchase[];
  canEditPo?: boolean;
  canEditPurchase?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {!canEditPo && !canEditPurchase ? (
        <div className="xl:col-span-2">
          <RoleNotice message="Your role is read-only on orders. Sales can edit customer POs; procurement can update supplier shipments." />
        </div>
      ) : null}
      <Panel>
        <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
          Customer purchase orders
        </div>
        <div className="divide-y divide-tss-border/70">
          {purchaseOrders.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-tss-slate">No customer POs yet</p>
          ) : (
            purchaseOrders.map((po) => (
              <div key={po.id} className="space-y-2 px-4 py-3 text-sm">
                <div>
                  <Link
                    href={`/enquiries/${po.enquiryId}`}
                    className="font-medium text-tss-steel hover:underline"
                  >
                    {po.number}
                  </Link>
                  <div className="text-xs text-tss-slate">
                    {po.customer.name} · {po.enquiry.number} · {formatDate(po.receivedAt)}
                  </div>
                </div>
                <form
                  className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!canEditPo) return;
                    const fd = new FormData(e.currentTarget);
                    startTransition(async () => {
                      await updatePurchaseOrderNotes(po.id, fd);
                      router.refresh();
                    });
                  }}
                >
                  <div className="space-y-1">
                    <Label>Customer PO ref</Label>
                    <Input name="customerPoRef" defaultValue={po.customerPoRef || ""} disabled={!canEditPo} />
                  </div>
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Input name="notes" defaultValue={po.notes || ""} disabled={!canEditPo} />
                  </div>
                  {canEditPo ? (
                    <div className="flex items-end">
                      <Button type="submit" size="sm" disabled={pending}>
                        Save
                      </Button>
                    </div>
                  ) : null}
                </form>
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel>
        <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
          Supplier purchases & shipment tracking
        </div>
        <div className="divide-y divide-tss-border/70">
          {purchases.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-tss-slate">
              No supplier purchases yet
            </p>
          ) : (
            purchases.map((p) => {
              const total = p.lines.reduce(
                (s, l) =>
                  s +
                  decimalToNumber(l.quantity as never) *
                    decimalToNumber(l.unitCost as never),
                0
              );
              return (
                <div key={p.id} className="space-y-3 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <a
                        href={`/api/pdf/purchase/${p.id}`}
                        className="font-medium text-tss-steel hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {p.number}
                      </a>
                      <div className="text-xs text-tss-slate">
                        {p.supplier.name} · {p.enquiry.number} ·{" "}
                        {formatMoney(total, p.currency)}
                      </div>
                    </div>
                    <Badge tone="info">{p.status}</Badge>
                  </div>

                  <form
                    className="grid gap-2 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!canEditPurchase) return;
                      const fd = new FormData(e.currentTarget);
                      startTransition(async () => {
                        await updateShipment(p.id, fd);
                        router.refresh();
                      });
                    }}
                  >
                    <fieldset disabled={!canEditPurchase} className="contents">
                    <div className="space-y-1">
                      <Label>Status</Label>
                      <select
                        name="status"
                        defaultValue={p.status}
                        className="flex h-9 w-full rounded-md border border-tss-border bg-white px-2 text-sm"
                      >
                        {["SENT", "CONFIRMED", "SHIPPED", "RECEIVED", "CLOSED"].map(
                          (st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Carrier</Label>
                      <Input name="carrier" defaultValue={p.carrier || ""} />
                    </div>
                    <div className="space-y-1">
                      <Label>Tracking / AWB / BL</Label>
                      <Input name="trackingNo" defaultValue={p.trackingNo || ""} />
                    </div>
                    <div className="space-y-1">
                      <Label>Delivery port</Label>
                      <Input name="deliveryPort" defaultValue={p.deliveryPort || ""} />
                    </div>
                    <div className="space-y-1">
                      <Label>ETD</Label>
                      <Input name="etd" type="date" defaultValue={toInputDate(p.etd)} />
                    </div>
                    <div className="space-y-1">
                      <Label>ETA</Label>
                      <Input name="eta" type="date" defaultValue={toInputDate(p.eta)} />
                    </div>
                    </fieldset>
                    {canEditPurchase ? (
                      <div className="sm:col-span-2">
                        <Button type="submit" size="sm" disabled={pending}>
                          Save shipment
                        </Button>
                      </div>
                    ) : null}
                  </form>
                </div>
              );
            })
          )}
        </div>
      </Panel>
    </div>
  );
}
