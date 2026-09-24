"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPayment, updatePaymentStatus } from "@/app/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { RoleNotice } from "@/components/ui/role-notice";
import { Badge } from "@/components/ui/badge";
import { formatMoney, decimalToNumber, formatDate } from "@/lib/utils";
import type { PaymentStatus } from "@prisma/client";

type InvoiceOpt = {
  id: string;
  number: string;
  supplierId: string;
  totalAmount: unknown;
  currency: string;
  matchStatus: string;
  supplier: { name: string; kycStatus: string; complianceHold: boolean };
};

type PaymentRow = {
  id: string;
  number: string;
  amount: unknown;
  currency: string;
  status: string;
  method: string | null;
  reference: string | null;
  kycCleared: boolean;
  scheduledAt: Date | string | null;
  settledAt: Date | string | null;
  supplier: { name: string };
  invoice: { number: string } | null;
};

export function PaymentsManager({
  invoices,
  payments,
  suppliers,
  canEdit = true,
}: {
  invoices: InvoiceOpt[];
  payments: PaymentRow[];
  suppliers: { id: string; name: string; kycStatus: string; complianceHold: boolean }[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id || "");
  const [error, setError] = useState("");
  const invoice = invoices.find((i) => i.id === invoiceId);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    if (invoice) {
      fd.set("invoiceId", invoice.id);
      fd.set("supplierId", invoice.supplierId);
      if (!fd.get("amount")) {
        fd.set("amount", String(decimalToNumber(invoice.totalAmount as never)));
      }
      fd.set("currency", invoice.currency);
    }
    startTransition(async () => {
      try {
        await createPayment(fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function setStatus(id: string, status: PaymentStatus) {
    setError("");
    startTransition(async () => {
      try {
        await updatePaymentStatus(id, status);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      {!canEdit ? (
        <RoleNotice message="Your role can view payments but not create or settle them." />
      ) : null}
      {canEdit ? (
      <Panel className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-tss-navy">
          Settlement (Marcura-style KYC gate)
        </h3>
        <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label>Matched invoice</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
            >
              <option value="">— Select —</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.number} · {i.supplier.name} · {i.matchStatus}
                </option>
              ))}
            </select>
            {invoice ? (
              <p className="mt-1 text-xs text-tss-slate">
                KYC {invoice.supplier.kycStatus}
                {invoice.supplier.complianceHold ? " · HOLD" : ""} ·{" "}
                {formatMoney(decimalToNumber(invoice.totalAmount as never), invoice.currency)}
              </p>
            ) : null}
          </div>
          <div>
            <Label>Amount</Label>
            <Input
              name="amount"
              type="number"
              step="0.01"
              className="mt-1"
              defaultValue={
                invoice ? String(decimalToNumber(invoice.totalAmount as never)) : ""
              }
              key={invoiceId}
            />
          </div>
          <div>
            <Label>Method</Label>
            <Input name="method" placeholder="Wire / ACH / LC" className="mt-1" />
          </div>
          <div>
            <Label>Reference</Label>
            <Input name="reference" className="mt-1" />
          </div>
          <div>
            <Label>Schedule</Label>
            <Input name="scheduledAt" type="date" className="mt-1" />
          </div>
          {!invoice ? (
            <div className="md:col-span-3">
              <Label>Supplier (no invoice)</Label>
              <select
                name="supplierId"
                className="mt-1 flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.kycStatus})
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="md:col-span-3">
            <Button type="submit" disabled={pending}>
              Create payment
            </Button>
          </div>
        </form>
        {error ? <p className="mt-2 text-sm text-tss-danger">{error}</p> : null}
      </Panel>
      ) : null}

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
          Payments
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-tss-surface text-[10.5px] uppercase tracking-[0.08em] text-tss-slate">
            <tr>
              <th className="px-4 py-2">Payment</th>
              <th className="px-4 py-2">Supplier</th>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-tss-border">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-tss-navy">{p.number}</div>
                  <div className="text-xs text-tss-slate">
                    {p.method || "—"} {p.reference ? `· ${p.reference}` : ""}
                  </div>
                </td>
                <td className="px-4 py-2.5">{p.supplier.name}</td>
                <td className="px-4 py-2.5">{p.invoice?.number || "—"}</td>
                <td className="px-4 py-2.5">
                  {formatMoney(decimalToNumber(p.amount as never), p.currency)}
                </td>
                <td className="px-4 py-2.5">
                  <Badge
                    tone={
                      p.status === "SETTLED"
                        ? "success"
                        : p.status === "FAILED"
                          ? "danger"
                          : "info"
                    }
                  >
                    {p.status}
                  </Badge>
                  {p.kycCleared ? (
                    <div className="mt-1 text-[11px] text-tss-slate">KYC cleared</div>
                  ) : null}
                  {p.settledAt ? (
                    <div className="text-[11px] text-tss-slate">
                      Settled {formatDate(p.settledAt)}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 space-x-1">
                  {canEdit && p.status !== "AUTHORIZED" && p.status !== "SETTLED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => setStatus(p.id, "AUTHORIZED")}
                    >
                      Authorize
                    </Button>
                  ) : null}
                  {canEdit && p.status !== "SETTLED" ? (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => setStatus(p.id, "SETTLED")}
                    >
                      Settle
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 ? (
          <p className="px-4 py-6 text-sm text-tss-slate">No payments yet.</p>
        ) : null}
      </Panel>
    </div>
  );
}
