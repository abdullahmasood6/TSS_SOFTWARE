"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEnquiry } from "@/app/actions/workflow";
import { createEnquiryFromTemplate } from "@/app/actions/shipserv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/ui/panel";
import { Plus, Trash2 } from "lucide-react";

type PartOption = {
  id: string;
  partNumber: string;
  description: string;
  unit: string;
  brand: string | null;
  impaCode: string | null;
};

type TemplateOption = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  lines: {
    partId: string | null;
    partNumber: string;
    description: string;
    impaCode: string | null;
    brand: string | null;
    quantity: unknown;
    unit: string;
  }[];
};

type Line = {
  key: string;
  partId?: string;
  partNumber: string;
  description: string;
  impaCode: string;
  brand: string;
  quantity: number;
  unit: string;
};

export function EnquiryForm({
  customers,
  parts,
  vessels,
  templates,
}: {
  customers: { id: string; name: string }[];
  parts: PartOption[];
  vessels: { id: string; name: string; customerId: string | null }[];
  templates: TemplateOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [templateId, setTemplateId] = useState("");
  const [lines, setLines] = useState<Line[]>([
    {
      key: "1",
      partNumber: "",
      description: "",
      impaCode: "",
      brand: "",
      quantity: 1,
      unit: "EA",
    },
  ]);

  const partMap = useMemo(() => new Map(parts.map((p) => [p.partNumber, p])), [parts]);
  const customerVessels = vessels.filter(
    (v) => !v.customerId || v.customerId === customerId
  );

  function applyTemplate(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setLines(
      tpl.lines.map((l, i) => ({
        key: `${i}-${l.partNumber}`,
        partId: l.partId || undefined,
        partNumber: l.partNumber,
        description: l.description,
        impaCode: l.impaCode || "",
        brand: l.brand || "",
        quantity: Number(l.quantity) || 1,
        unit: l.unit,
      }))
    );
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.partNumber != null) {
          const match = partMap.get(patch.partNumber);
          if (match) {
            next.partId = match.id;
            next.description = match.description;
            next.unit = match.unit;
            next.brand = match.brand || "";
            next.impaCode = match.impaCode || "";
          }
        }
        return next;
      })
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set(
      "lines",
      JSON.stringify(
        lines.map(({ partId, partNumber, description, impaCode, brand, quantity, unit }) => ({
          partId,
          partNumber,
          description,
          impaCode: impaCode || null,
          brand: brand || null,
          quantity,
          unit,
        }))
      )
    );

    startTransition(async () => {
      try {
        let id: string;
        if (templateId && lines.length > 0) {
          // Prefer explicit line payload so user edits to template lines are kept
          id = await createEnquiry(fd);
        } else if (templateId) {
          fd.set("templateId", templateId);
          id = await createEnquiryFromTemplate(fd);
        } else {
          id = await createEnquiry(fd);
        }
        router.push(`/enquiries/${id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create enquiry");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Panel className="grid gap-4 p-4 md:grid-cols-2">
        {templates.length > 0 ? (
          <div className="space-y-1 md:col-span-2">
            <Label>Start from template</Label>
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            >
              <option value="">Blank enquiry</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.category ? ` (${t.category})` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1 md:col-span-2">
          <Label>Customer</Label>
          <select
            name="customerId"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            required
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Subject</Label>
          <Input name="subject" placeholder="Enquiry subject" />
        </div>
        <div className="space-y-1">
          <Label>Vessel registry</Label>
          <select
            name="vesselId"
            className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            defaultValue=""
          >
            <option value="">Select vessel…</option>
            {customerVessels.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Vessel name (if not listed)</Label>
          <Input name="vesselName" placeholder="Vessel name" />
        </div>
        <div className="space-y-1">
          <Label>Delivery port</Label>
          <Input name="deliveryPort" placeholder="e.g. Singapore, Rotterdam" />
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <Input name="category" placeholder="SPARES / STORES / SERVICES" defaultValue="SPARES" />
        </div>
        <div className="space-y-1">
          <Label>Priority</Label>
          <select
            name="priority"
            className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            defaultValue="NORMAL"
          >
            <option value="NORMAL">NORMAL</option>
            <option value="URGENT">URGENT</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Due date</Label>
          <Input name="dueDate" type="date" />
        </div>
        <div className="space-y-1">
          <Label>Customer reference</Label>
          <Input name="reference" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Notes</Label>
          <Textarea name="notes" rows={2} />
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between border-b border-tss-border px-4 py-3">
          <h2 className="text-sm font-semibold text-tss-navy">Line items</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setLines((prev) => [
                ...prev,
                {
                  key: String(Date.now()),
                  partNumber: "",
                  description: "",
                  impaCode: "",
                  brand: "",
                  quantity: 1,
                  unit: "EA",
                },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add line
          </Button>
        </div>
        <div className="space-y-3 p-4">
          {lines.map((line) => (
            <div
              key={line.key}
              className="grid gap-2 rounded-md border border-tss-border/80 bg-tss-surface/60 p-3 md:grid-cols-[1fr_1.4fr_0.7fr_0.7fr_0.55fr_0.45fr_auto]"
            >
              <div className="space-y-1">
                <Label>Part #</Label>
                <Input
                  list="part-options"
                  value={line.partNumber}
                  onChange={(e) => updateLine(line.key, { partNumber: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input
                  value={line.description}
                  onChange={(e) => updateLine(line.key, { description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>IMPA</Label>
                <Input
                  value={line.impaCode}
                  onChange={(e) => updateLine(line.key, { impaCode: e.target.value })}
                  placeholder="e.g. 591501"
                />
              </div>
              <div className="space-y-1">
                <Label>Brand</Label>
                <Input
                  value={line.brand}
                  onChange={(e) => updateLine(line.key, { brand: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min={0.001}
                  step="any"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(line.key, { quantity: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Unit</Label>
                <Input
                  value={line.unit}
                  onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={lines.length === 1}
                  onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                >
                  <Trash2 className="h-4 w-4 text-tss-danger" />
                </Button>
              </div>
            </div>
          ))}
          <datalist id="part-options">
            {parts.map((p) => (
              <option key={p.id} value={p.partNumber}>
                {p.description}
              </option>
            ))}
          </datalist>
        </div>
      </Panel>

      {error ? <p className="text-sm text-tss-danger">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create enquiry"}
      </Button>
    </form>
  );
}
