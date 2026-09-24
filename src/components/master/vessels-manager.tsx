"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createVessel, updateVessel } from "@/app/actions/vessels-shipments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Vessel = {
  id: string;
  name: string;
  imo: string | null;
  flag: string | null;
  vesselType: string | null;
  engineMake: string | null;
  engineModel: string | null;
  customerId: string | null;
  notes: string | null;
  active: boolean;
  customer: { name: string } | null;
  _count: { enquiries: number };
};

export function VesselsManager({
  vessels,
  customers,
}: {
  vessels: Vessel[];
  customers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Vessel | null>(null);
  const [creating, setCreating] = useState(false);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      if (editing) await updateVessel(editing.id, fd);
      else await createVessel(fd);
      setEditing(null);
      setCreating(false);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Panel>
        <table className="w-full text-sm">
          <thead className="bg-tss-steel-soft/50 text-left text-xs uppercase text-tss-slate">
            <tr>
              <th className="px-4 py-2">Vessel</th>
              <th className="px-4 py-2">IMO</th>
              <th className="px-4 py-2">Owner / manager</th>
              <th className="px-4 py-2">Engine</th>
              <th className="px-4 py-2">Enquiries</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {vessels.map((v) => (
              <tr key={v.id} className="border-t border-tss-border/70">
                <td className="px-4 py-2.5">
                  <div className="font-medium">{v.name}</div>
                  <div className="text-xs text-tss-slate">
                    {v.vesselType || "—"} · {v.flag || "—"}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{v.imo || "—"}</td>
                <td className="px-4 py-2.5">
                  {v.customerId && v.customer ? (
                    <Link
                      href={`/customers/${v.customerId}`}
                      className="text-tss-steel hover:underline"
                    >
                      {v.customer.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5 text-tss-slate">
                  {[v.engineMake, v.engineModel].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/enquiries?q=${encodeURIComponent(v.name)}`}>
                    <Badge tone="info">{v._count.enquiries}</Badge>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button type="button" size="sm" variant="ghost" onClick={() => {
                    setCreating(false);
                    setEditing(v);
                  }}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-tss-navy">
            {editing ? "Edit vessel" : "Add vessel"}
          </h2>
          {!creating && !editing ? (
            <Button type="button" size="sm" onClick={() => { setEditing(null); setCreating(true); }}>
              New
            </Button>
          ) : null}
        </div>
        {(creating || editing) && (
          <form onSubmit={onSave} className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input name="name" required defaultValue={editing?.name || ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>IMO</Label>
                <Input name="imo" defaultValue={editing?.imo || ""} />
              </div>
              <div className="space-y-1">
                <Label>Flag</Label>
                <Input name="flag" defaultValue={editing?.flag || ""} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Input name="vesselType" defaultValue={editing?.vesselType || ""} placeholder="Bulk / Tanker / Container" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Engine make</Label>
                <Input name="engineMake" defaultValue={editing?.engineMake || ""} />
              </div>
              <div className="space-y-1">
                <Label>Engine model</Label>
                <Input name="engineModel" defaultValue={editing?.engineModel || ""} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Customer</Label>
              <select
                name="customerId"
                defaultValue={editing?.customerId || ""}
                className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
              >
                <option value="">Unassigned</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea name="notes" rows={2} defaultValue={editing?.notes || ""} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
        {!creating && !editing ? (
          <p className="text-sm text-tss-slate">Select Edit or click New to manage vessels.</p>
        ) : null}
      </Panel>
    </div>
  );
}
