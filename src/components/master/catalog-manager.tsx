"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPart, updatePart, setPartActive } from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { formatMoney, formatDate } from "@/lib/utils";
import Link from "next/link";

type PartRow = {
  id: string;
  partNumber: string;
  description: string;
  manufacturer: string | null;
  brand: string | null;
  impaCode: string | null;
  category: string | null;
  unit: string;
  notes: string | null;
  active: boolean;
  lastSell?: { price: number; date: Date; currency: string } | null;
};

const emptyForm = {
  partNumber: "",
  description: "",
  manufacturer: "",
  brand: "",
  impaCode: "",
  category: "",
  unit: "EA",
  notes: "",
};

export function CatalogManager({ parts }: { parts: PartRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<PartRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setForm(emptyForm);
  }

  function startEdit(p: PartRow) {
    setCreating(false);
    setEditing(p);
    setForm({
      partNumber: p.partNumber,
      description: p.description,
      manufacturer: p.manufacturer || "",
      brand: p.brand || "",
      impaCode: p.impaCode || "",
      category: p.category || "",
      unit: p.unit,
      notes: p.notes || "",
    });
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      try {
        if (editing) await updatePart(editing.id, fd);
        else await createPart(fd);
        setEditing(null);
        setCreating(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Panel>
        <table className="w-full text-sm">
          <thead className="bg-tss-steel-soft/50 text-left text-xs uppercase tracking-wide text-tss-slate">
            <tr>
              <th className="px-4 py-2">Part #</th>
              <th className="px-4 py-2">IMPA</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Brand</th>
              <th className="px-4 py-2">Last sell</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className="border-t border-tss-border/70">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/price-history?q=${encodeURIComponent(p.partNumber)}`}
                    className="font-mono text-xs font-semibold text-tss-steel hover:underline"
                  >
                    {p.partNumber}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-tss-slate">
                  {p.impaCode || "—"}
                </td>
                <td className="px-4 py-2.5">{p.description}</td>
                <td className="px-4 py-2.5 text-tss-slate">
                  {p.brand || p.manufacturer || "—"}
                </td>
                <td className="px-4 py-2.5">
                  {p.lastSell ? (
                    <div>
                      <div className="font-medium">
                        {formatMoney(p.lastSell.price, p.lastSell.currency)}
                      </div>
                      <div className="text-xs text-tss-slate">
                        {formatDate(p.lastSell.date)}
                      </div>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={p.active ? "success" : "neutral"}>
                    {p.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(p)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await setPartActive(p.id, !p.active);
                        router.refresh();
                      })
                    }
                  >
                    {p.active ? "Deactivate" : "Activate"}
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
            {editing ? "Edit part" : "Add part"}
          </h2>
          {!creating && !editing ? (
            <Button type="button" size="sm" onClick={startCreate}>
              New
            </Button>
          ) : null}
        </div>
        {(creating || editing) && (
          <form onSubmit={onSave} className="space-y-3">
            <div className="space-y-1">
              <Label>Part number</Label>
              <Input
                required
                value={form.partNumber}
                onChange={(e) => setForm((f) => ({ ...f, partNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>IMPA code</Label>
                <Input
                  value={form.impaCode}
                  onChange={(e) => setForm((f) => ({ ...f, impaCode: e.target.value }))}
                  placeholder="e.g. 591501"
                />
              </div>
              <div className="space-y-1">
                <Label>Brand</Label>
                <Input
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Manufacturer</Label>
                <Input
                  value={form.manufacturer}
                  onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
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
        {!creating && !editing ? (
          <p className="text-sm text-tss-slate">Select Edit on a row, or click New.</p>
        ) : null}
      </Panel>
    </div>
  );
}
