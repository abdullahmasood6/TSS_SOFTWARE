"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createSupplier,
  updateSupplier,
  setSupplierActive,
} from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { RoleNotice } from "@/components/ui/role-notice";

type Supplier = {
  id: string;
  code: string | null;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  leadTimeDays: number | null;
  brandsServed: string | null;
  categories: string | null;
  portsServed: string | null;
  notes: string | null;
  active: boolean;
};

const emptyForm = {
  code: "",
  name: "",
  contact: "",
  email: "",
  phone: "",
  address: "",
  country: "",
  leadTimeDays: "",
  brandsServed: "",
  categories: "",
  portsServed: "",
  notes: "",
};

export function SuppliersManager({ suppliers, canEdit = true }: { suppliers: Supplier[]; canEdit?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setForm(emptyForm);
  }

  function startEdit(s: Supplier) {
    setCreating(false);
    setEditing(s);
    setForm({
      code: s.code || "",
      name: s.name,
      contact: s.contact || "",
      email: s.email || "",
      phone: s.phone || "",
      address: s.address || "",
      country: s.country || "",
      leadTimeDays: s.leadTimeDays != null ? String(s.leadTimeDays) : "",
      brandsServed: s.brandsServed || "",
      categories: s.categories || "",
      portsServed: s.portsServed || "",
      notes: s.notes || "",
    });
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      try {
        if (editing) await updateSupplier(editing.id, fd);
        else await createSupplier(fd);
        setEditing(null);
        setCreating(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Panel>
        <table className="w-full text-sm">
          <thead className="bg-tss-steel-soft/50 text-left text-xs uppercase tracking-wide text-tss-slate">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Brands</th>
              <th className="px-4 py-2">Lead time</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-t border-tss-border/70">
                <td className="px-4 py-2.5 font-mono text-xs">{s.code || "—"}</td>
                <td className="px-4 py-2.5 font-medium">
                  <Link href={`/suppliers/${s.id}`} className="text-tss-steel hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-tss-slate">{s.brandsServed || "—"}</td>
                <td className="px-4 py-2.5 text-tss-slate">
                  {s.leadTimeDays != null ? `${s.leadTimeDays} days` : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={s.active ? "success" : "neutral"}>
                    {s.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/suppliers/${s.id}`}>Open</Link>
                  </Button>
                  {canEdit ? (
                    <>
                      <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(s)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await setSupplierActive(s.id, !s.active);
                            router.refresh();
                          })
                        }
                      >
                        {s.active ? "Deactivate" : "Activate"}
                      </Button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="p-4">
        {!canEdit ? (
          <RoleNotice message="Your role can view suppliers but not create or edit them." />
        ) : null}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-tss-navy">
            {editing ? "Edit supplier" : "Add supplier"}
          </h2>
          {canEdit && !creating && !editing ? (
            <Button type="button" size="sm" onClick={startCreate}>
              New
            </Button>
          ) : null}
        </div>
        {canEdit && (creating || editing) && (
          <form onSubmit={onSave} className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Lead time (days)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.leadTimeDays}
                  onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Brands served</Label>
              <Input
                value={form.brandsServed}
                onChange={(e) => setForm((f) => ({ ...f, brandsServed: e.target.value }))}
                placeholder="MAN, Wärtsilä, Yanmar"
              />
            </div>
            <div className="space-y-1">
              <Label>Categories</Label>
              <Input
                value={form.categories}
                onChange={(e) => setForm((f) => ({ ...f, categories: e.target.value }))}
                placeholder="Engine, Pump, Electrical"
              />
            </div>
            <div className="space-y-1">
              <Label>Ports served</Label>
              <Input
                value={form.portsServed}
                onChange={(e) => setForm((f) => ({ ...f, portsServed: e.target.value }))}
                placeholder="Singapore, Rotterdam, Busan"
              />
            </div>
            <div className="space-y-1">
              <Label>Contact</Label>
              <Input
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {error ? <p className="text-sm text-tss-danger">{error}</p> : null}
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
        {canEdit && !creating && !editing ? (
          <p className="text-sm text-tss-slate">Select Edit on a row, or click New.</p>
        ) : null}
      </Panel>
    </div>
  );
}
