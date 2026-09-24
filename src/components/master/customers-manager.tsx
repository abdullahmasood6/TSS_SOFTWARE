"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createCustomer,
  updateCustomer,
  setCustomerActive,
} from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { RoleNotice } from "@/components/ui/role-notice";

type Customer = {
  id: string;
  code: string | null;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  notes: string | null;
  active: boolean;
};

const empty: Omit<Customer, "id" | "active"> = {
  code: "",
  name: "",
  contact: "",
  email: "",
  phone: "",
  address: "",
  country: "",
  notes: "",
};

export function CustomersManager({ customers, canEdit = true }: { customers: Customer[]; canEdit?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setForm(empty);
    setError("");
  }

  function startEdit(c: Customer) {
    setCreating(false);
    setEditing(c);
    setForm({
      code: c.code || "",
      name: c.name,
      contact: c.contact || "",
      email: c.email || "",
      phone: c.phone || "",
      address: c.address || "",
      country: c.country || "",
      notes: c.notes || "",
    });
    setError("");
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v || ""));
    startTransition(async () => {
      try {
        if (editing) await updateCustomer(editing.id, fd);
        else await createCustomer(fd);
        setEditing(null);
        setCreating(false);
        setForm(empty);
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
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Country</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-tss-border/70">
                <td className="px-4 py-2.5 font-mono text-xs">{c.code || "—"}</td>
                <td className="px-4 py-2.5 font-medium">
                  <Link href={`/customers/${c.id}`} className="text-tss-steel hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-tss-slate">{c.contact || c.email || "—"}</td>
                <td className="px-4 py-2.5">{c.country || "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={c.active ? "success" : "neutral"}>
                    {c.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/customers/${c.id}`}>Open</Link>
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(c)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await setCustomerActive(c.id, !c.active);
                        router.refresh();
                      })
                    }
                  >
                    {c.active ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="p-4">
        {!canEdit ? <RoleNotice message="Your role can view customers but not create or edit them." /> : null}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-tss-navy">
            {editing ? "Edit customer" : "Add customer"}
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
                  value={form.code || ""}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Input
                  value={form.country || ""}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Contact</Label>
              <Input
                value={form.contact || ""}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={form.phone || ""}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={form.address || ""}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes || ""}
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
          <p className="text-sm text-tss-slate">Select Edit on a row, or click New to add a customer.</p>
        ) : null}
        {!canEdit ? (
          <p className="text-sm text-tss-slate">Browse the list for customer details. Contact an admin or sales user to make changes.</p>
        ) : null}
      </Panel>
    </div>
  );
}
