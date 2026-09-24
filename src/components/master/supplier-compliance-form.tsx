"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSupplierCompliance } from "@/app/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/ui/panel";

type SupplierCompliance = {
  id: string;
  kind: string;
  kycStatus: string;
  kycNotes: string | null;
  complianceHold: boolean;
  paymentTermsDays: number | null;
  bankName: string | null;
  bankAccountRef: string | null;
  ratingScore: unknown;
  categories: string | null;
  portsServed: string | null;
  brandsServed: string | null;
};

export function SupplierComplianceForm({ supplier }: { supplier: SupplierCompliance }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("complianceHold", fd.get("complianceHold") ? "true" : "false");
    startTransition(async () => {
      await updateSupplierCompliance(supplier.id, fd);
      router.refresh();
    });
  }

  return (
    <Panel className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-tss-navy">KYC & marketplace profile</h3>
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Kind</Label>
          <select
            name="kind"
            defaultValue={supplier.kind}
            className="mt-1 flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
          >
            <option value="SUPPLIER">Parts supplier</option>
            <option value="SERVICE_PROVIDER">Service provider</option>
          </select>
        </div>
        <div>
          <Label>KYC status</Label>
          <select
            name="kycStatus"
            defaultValue={supplier.kycStatus}
            className="mt-1 flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
          >
            <option value="PENDING">Pending</option>
            <option value="CLEAR">Clear</option>
            <option value="REVIEW">Review</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
        <div>
          <Label>Payment terms (days)</Label>
          <Input
            name="paymentTermsDays"
            type="number"
            className="mt-1"
            defaultValue={supplier.paymentTermsDays ?? ""}
          />
        </div>
        <div>
          <Label>Rating (0–10)</Label>
          <Input
            name="ratingScore"
            type="number"
            step="0.1"
            min={0}
            max={10}
            className="mt-1"
            defaultValue={supplier.ratingScore != null ? String(supplier.ratingScore) : ""}
          />
        </div>
        <div>
          <Label>Bank name</Label>
          <Input name="bankName" className="mt-1" defaultValue={supplier.bankName || ""} />
        </div>
        <div>
          <Label>Bank account ref</Label>
          <Input
            name="bankAccountRef"
            className="mt-1"
            defaultValue={supplier.bankAccountRef || ""}
          />
        </div>
        <div>
          <Label>Ports served</Label>
          <Input name="portsServed" className="mt-1" defaultValue={supplier.portsServed || ""} />
        </div>
        <div>
          <Label>Categories</Label>
          <Input name="categories" className="mt-1" defaultValue={supplier.categories || ""} />
        </div>
        <div className="md:col-span-2">
          <Label>Brands</Label>
          <Input name="brandsServed" className="mt-1" defaultValue={supplier.brandsServed || ""} />
        </div>
        <div className="md:col-span-2">
          <Label>KYC notes</Label>
          <Textarea name="kycNotes" rows={2} className="mt-1" defaultValue={supplier.kycNotes || ""} />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            name="complianceHold"
            defaultChecked={supplier.complianceHold}
          />
          Compliance hold (blocks payments)
        </label>
        <div>
          <Button type="submit" disabled={pending}>
            Save compliance
          </Button>
        </div>
      </form>
    </Panel>
  );
}
