"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEnquiryTemplate, deleteEnquiryTemplate } from "@/app/actions/shipserv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/ui/panel";
import { RoleNotice } from "@/components/ui/role-notice";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

type PartOption = {
  id: string;
  partNumber: string;
  description: string;
  unit: string;
  brand: string | null;
  impaCode: string | null;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  lines: {
    id: string;
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

export function TemplatesManager({
  templates,
  parts,
  canEdit = true,
}: {
  templates: Template[];
  parts: PartOption[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("SPARES");
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

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fd = new FormData();
    fd.set("name", name);
    fd.set("description", description);
    fd.set("category", category);
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
        await createEnquiryTemplate(fd);
        setCreating(false);
        setName("");
        setDescription("");
        setLines([
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
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      {!canEdit ? (
        <RoleNotice message="Your role can view templates but not create or delete them." />
      ) : null}
      {canEdit ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => setCreating((v) => !v)}>
            {creating ? "Close" : "New template"}
          </Button>
        </div>
      ) : null}

      {canEdit && creating ? (
        <Panel className="p-4">
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-1">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="When to use this template"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lines</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
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
              {lines.map((line) => (
                <div
                  key={line.key}
                  className="grid gap-2 rounded-md border border-tss-border/80 p-3 md:grid-cols-[1fr_1.4fr_0.8fr_0.8fr_0.5fr_0.4fr_auto]"
                >
                  <Input
                    list="tpl-parts"
                    placeholder="Part #"
                    value={line.partNumber}
                    onChange={(e) => updateLine(line.key, { partNumber: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => updateLine(line.key, { description: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="IMPA"
                    value={line.impaCode}
                    onChange={(e) => updateLine(line.key, { impaCode: e.target.value })}
                  />
                  <Input
                    placeholder="Brand"
                    value={line.brand}
                    onChange={(e) => updateLine(line.key, { brand: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0.001}
                    step="any"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.key, { quantity: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <Input
                    value={line.unit}
                    onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                  >
                    <Trash2 className="h-4 w-4 text-tss-danger" />
                  </Button>
                </div>
              ))}
              <datalist id="tpl-parts">
                {parts.map((p) => (
                  <option key={p.id} value={p.partNumber}>
                    {p.description}
                  </option>
                ))}
              </datalist>
            </div>

            {error ? <p className="text-sm text-tss-danger">{error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save template"}
            </Button>
          </form>
        </Panel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <Panel key={t.id} className="p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-tss-navy">{t.name}</h3>
                <p className="text-xs text-tss-slate">{t.description || "No description"}</p>
              </div>
              <div className="flex items-center gap-2">
                {t.category ? <Badge tone="neutral">{t.category}</Badge> : null}
                {canEdit ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteEnquiryTemplate(t.id);
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-tss-danger" />
                  </Button>
                ) : null}
              </div>
            </div>
            <ul className="space-y-1 text-sm">
              {t.lines.map((l) => (
                <li key={l.id} className="flex justify-between gap-2 border-t border-tss-border/60 py-1.5">
                  <span>
                    <span className="font-mono text-xs">{l.partNumber}</span>{" "}
                    {l.description}
                    {l.impaCode || l.brand ? (
                      <span className="text-tss-slate">
                        {" "}
                        · {[l.impaCode, l.brand].filter(Boolean).join(" / ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-tss-slate">
                    {String(l.quantity)} {l.unit}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
        {templates.length === 0 ? (
          <Panel className="p-6 text-sm text-tss-slate md:col-span-2">
            No templates yet. Create one for recurring engine / stores enquiries.
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
