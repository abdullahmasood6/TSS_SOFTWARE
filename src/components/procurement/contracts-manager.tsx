"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContract, updateContractStatus } from "@/app/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/ui/panel";
import { RoleNotice } from "@/components/ui/role-notice";
import { Badge } from "@/components/ui/badge";
import { formatMoney, decimalToNumber, formatDate } from "@/lib/utils";
import type { ContractStatus } from "@prisma/client";

type ContractRow = {
  id: string;
  number: string;
  title: string;
  status: string;
  isTender: boolean;
  category: string | null;
  portName: string | null;
  currency: string;
  valueAmount: unknown;
  startDate: Date | string | null;
  endDate: Date | string | null;
  supplier: { name: string } | null;
};

export function ContractsManager({
  contracts,
  suppliers,
  ports,
  canEdit = true,
}: {
  contracts: ContractRow[];
  suppliers: { id: string; name: string }[];
  ports: { id: string; name: string; code: string }[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const portId = String(fd.get("portId") || "");
    const port = ports.find((p) => p.id === portId);
    if (port) fd.set("portName", port.name);
    startTransition(async () => {
      try {
        await createContract(fd);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function setStatus(id: string, status: ContractStatus) {
    startTransition(async () => {
      await updateContractStatus(id, status);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {!canEdit ? (
        <RoleNotice message="Your role can view contracts but not create or change status." />
      ) : null}
      {canEdit ? (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setOpen((v) => !v)}>
            {open ? "Cancel" : "New contract / tender"}
          </Button>
        </div>
      ) : null}

      {canEdit && open ? (
        <Panel className="p-4">
          <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Title</Label>
              <Input name="title" required className="mt-1" />
            </div>
            <div>
              <Label>Supplier (optional for open tender)</Label>
              <select
                name="supplierId"
                className="mt-1 flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
              >
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Port</Label>
              <select
                name="portId"
                className="mt-1 flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
              >
                <option value="">—</option>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Category</Label>
              <Input name="category" placeholder="Spares / Provisions / Repair" className="mt-1" />
            </div>
            <div>
              <Label>Value</Label>
              <Input name="valueAmount" type="number" step="0.01" className="mt-1" />
            </div>
            <div>
              <Label>Start</Label>
              <Input name="startDate" type="date" className="mt-1" />
            </div>
            <div>
              <Label>End</Label>
              <Input name="endDate" type="date" className="mt-1" />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input type="checkbox" name="isTender" value="true" id="isTender" />
              <label htmlFor="isTender" className="text-sm">
                Open as tender (multi-supplier bid)
              </label>
            </div>
            <div className="md:col-span-2">
              <Label>Terms</Label>
              <Textarea name="terms" rows={3} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={pending}>
                Create
              </Button>
              {error ? <span className="ml-3 text-sm text-tss-danger">{error}</span> : null}
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-tss-surface text-[10.5px] uppercase tracking-[0.08em] text-tss-slate">
            <tr>
              <th className="px-4 py-2">Contract</th>
              <th className="px-4 py-2">Supplier</th>
              <th className="px-4 py-2">Port</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id} className="border-t border-tss-border">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-tss-navy">{c.number}</div>
                  <div className="text-xs text-tss-slate">
                    {c.title}
                    {c.isTender ? " · Tender" : ""}
                    {c.category ? ` · ${c.category}` : ""}
                  </div>
                </td>
                <td className="px-4 py-2.5">{c.supplier?.name || "Open"}</td>
                <td className="px-4 py-2.5">{c.portName || "—"}</td>
                <td className="px-4 py-2.5">
                  {c.valueAmount != null
                    ? formatMoney(decimalToNumber(c.valueAmount as never), c.currency)
                    : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={c.status === "ACTIVE" ? "success" : "info"}>{c.status}</Badge>
                  <div className="mt-1 text-[11px] text-tss-slate">
                    {c.startDate ? formatDate(c.startDate) : "—"} →{" "}
                    {c.endDate ? formatDate(c.endDate) : "—"}
                  </div>
                </td>
                <td className="space-x-1 px-4 py-2.5">
                  {canEdit && (c.status === "DRAFT" || c.status === "OPEN") ? (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(c.id, "AWARDED")}>
                      Award
                    </Button>
                  ) : null}
                  {canEdit && c.status === "AWARDED" ? (
                    <Button size="sm" disabled={pending} onClick={() => setStatus(c.id, "ACTIVE")}>
                      Activate
                    </Button>
                  ) : null}
                  {canEdit && c.status !== "CANCELLED" && c.status !== "EXPIRED" ? (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus(c.id, "CANCELLED")}>
                      Cancel
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {contracts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-tss-slate">No contracts yet.</p>
        ) : null}
      </Panel>
    </div>
  );
}
