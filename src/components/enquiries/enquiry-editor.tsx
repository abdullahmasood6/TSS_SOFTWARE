"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateEnquiryDetails,
  cancelEnquiry,
  replaceEnquiryLines,
} from "@/app/actions/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/ui/panel";
import { EnquiryStatus } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import { decimalToNumber } from "@/lib/utils";

const statuses = Object.values(EnquiryStatus);

type Line = {
  key: string;
  partId?: string | null;
  partNumber: string;
  description: string;
  impaCode: string;
  brand: string;
  quantity: number;
  unit: string;
};

export function EnquiryEditor({
  enquiry,
  customers,
  users,
  vessels,
  canEditLines,
}: {
  enquiry: {
    id: string;
    customerId: string;
    vesselId: string | null;
    ownerId: string | null;
    subject: string | null;
    vesselName: string | null;
    category: string | null;
    priority: string;
    reference: string | null;
    deliveryPort: string | null;
    notes: string | null;
    dueDate: Date | null;
    status: EnquiryStatus;
    lines: {
      id: string;
      partId: string | null;
      partNumber: string;
      description: string;
      impaCode: string | null;
      brand: string | null;
      quantity: unknown;
      unit: string;
    }[];
  };
  customers: { id: string; name: string }[];
  users: { id: string; name: string }[];
  vessels: { id: string; name: string; customerId: string | null }[];
  canEditLines: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [lines, setLines] = useState<Line[]>(
    enquiry.lines.map((l) => ({
      key: l.id,
      partId: l.partId,
      partNumber: l.partNumber,
      description: l.description,
      impaCode: l.impaCode || "",
      brand: l.brand || "",
      quantity: decimalToNumber(l.quantity as never),
      unit: l.unit,
    }))
  );

  function saveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateEnquiryDetails(enquiry.id, fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function saveLines() {
    setError("");
    const fd = new FormData();
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
        await replaceEnquiryLines(enquiry.id, fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-tss-navy">Edit enquiry</h3>
        <form onSubmit={saveDetails} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Customer</Label>
            <select
              name="customerId"
              defaultValue={enquiry.customerId}
              className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Owner</Label>
            <select
              name="ownerId"
              defaultValue={enquiry.ownerId || ""}
              className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <select
              name="status"
              defaultValue={enquiry.status}
              className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Vessel</Label>
            <select
              name="vesselId"
              defaultValue={enquiry.vesselId || ""}
              className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            >
              <option value="">Custom / none</option>
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Vessel name (override)</Label>
            <Input name="vesselName" defaultValue={enquiry.vesselName || ""} />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Input
              name="category"
              defaultValue={enquiry.category || ""}
              placeholder="SPARES / STORES / SERVICES"
            />
          </div>
          <div className="space-y-1">
            <Label>Priority</Label>
            <select
              name="priority"
              defaultValue={enquiry.priority || "NORMAL"}
              className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
            >
              <option value="NORMAL">NORMAL</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Due date</Label>
            <Input
              name="dueDate"
              type="date"
              defaultValue={
                enquiry.dueDate
                  ? new Date(enquiry.dueDate).toISOString().slice(0, 10)
                  : ""
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Subject</Label>
            <Input name="subject" defaultValue={enquiry.subject || ""} />
          </div>
          <div className="space-y-1">
            <Label>Reference</Label>
            <Input name="reference" defaultValue={enquiry.reference || ""} />
          </div>
          <div className="space-y-1">
            <Label>Delivery port</Label>
            <Input name="deliveryPort" defaultValue={enquiry.deliveryPort || ""} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Notes</Label>
            <Textarea name="notes" rows={2} defaultValue={enquiry.notes || ""} />
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              Save changes
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending || enquiry.status === "CANCELLED"}
              onClick={() =>
                startTransition(async () => {
                  await cancelEnquiry(enquiry.id);
                  router.refresh();
                })
              }
            >
              Cancel enquiry
            </Button>
          </div>
        </form>
      </Panel>

      {canEditLines ? (
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-tss-navy">Edit line items</h3>
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
          <div className="space-y-2">
            {lines.map((line) => (
              <div
                key={line.key}
                className="grid gap-2 rounded border border-tss-border/80 p-2 md:grid-cols-[1fr_1.3fr_0.7fr_0.7fr_0.55fr_0.45fr_auto]"
              >
                <Input
                  placeholder="Part #"
                  value={line.partNumber}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key ? { ...l, partNumber: e.target.value } : l
                      )
                    )
                  }
                />
                <Input
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key ? { ...l, description: e.target.value } : l
                      )
                    )
                  }
                />
                <Input
                  placeholder="IMPA"
                  value={line.impaCode}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key ? { ...l, impaCode: e.target.value } : l
                      )
                    )
                  }
                />
                <Input
                  placeholder="Brand"
                  value={line.brand}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key ? { ...l, brand: e.target.value } : l
                      )
                    )
                  }
                />
                <Input
                  type="number"
                  step="any"
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key
                          ? { ...l, quantity: parseFloat(e.target.value) || 0 }
                          : l
                      )
                    )
                  }
                />
                <Input
                  value={line.unit}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key ? { ...l, unit: e.target.value } : l
                      )
                    )
                  }
                />
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
            ))}
          </div>
          <Button type="button" className="mt-3" disabled={pending} onClick={saveLines}>
            Save lines
          </Button>
          <p className="mt-2 text-xs text-tss-slate">
            Line edits are only available before RFQs or quotes are created.
          </p>
        </Panel>
      ) : null}

      {error ? <p className="text-sm text-tss-danger">{error}</p> : null}
    </div>
  );
}
