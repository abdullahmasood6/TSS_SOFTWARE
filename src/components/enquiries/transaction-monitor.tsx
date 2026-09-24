"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addDocumentNote,
  markRfqAcknowledged,
  markRfqOpened,
} from "@/app/actions/shipserv";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import type { MonitorStep, MonitorEvent } from "@/lib/transaction-monitor";

const stepTone: Record<string, string> = {
  done: "bg-emerald-500",
  active: "bg-tss-steel animate-pulse",
  waiting: "bg-tss-border",
  overdue: "bg-tss-danger",
  skipped: "bg-amber-400",
};

export function TransactionMonitor({
  enquiryId,
  steps,
  rfqRows,
  timeline,
  summary,
}: {
  enquiryId: string;
  steps: MonitorStep[];
  rfqRows: {
    id: string;
    number: string;
    supplier: string;
    status: string;
    sentAt: Date;
    openedAt: Date | null;
    respondedAt: Date | null;
    dueAt: Date | null;
    overdue: boolean;
  }[];
  timeline: MonitorEvent[];
  summary: {
    openCount: number;
    overdueCount: number;
    dueLabel: string | null;
    isEnquiryOverdue: boolean;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-tss-navy">Transaction monitor</h3>
            <p className="mt-0.5 text-xs text-tss-slate">
              Track RFQ open / respond status through PO — ShipServ-style visibility.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={summary.openCount ? "warning" : "success"}>
              {summary.openCount} open RFQ{summary.openCount === 1 ? "" : "s"}
            </Badge>
            {summary.overdueCount > 0 ? (
              <Badge tone="danger">{summary.overdueCount} overdue</Badge>
            ) : null}
            {summary.isEnquiryOverdue ? <Badge tone="danger">Enquiry overdue</Badge> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {steps.map((step, i) => (
            <div key={step.id} className="flex min-w-[7.5rem] flex-1 items-stretch gap-2">
              <div className="flex flex-1 flex-col rounded-md border border-tss-border/80 bg-tss-surface/50 p-2.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", stepTone[step.status])} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-tss-slate">
                    {step.status}
                  </span>
                </div>
                <div className="text-xs font-semibold text-tss-navy">{step.title}</div>
                {step.subtitle ? (
                  <div className="mt-0.5 text-[11px] text-tss-slate">{step.subtitle}</div>
                ) : null}
                {step.at ? (
                  <div className="mt-1 text-[10px] text-tss-slate">{formatDate(step.at)}</div>
                ) : null}
              </div>
              {i < steps.length - 1 ? (
                <div className="hidden w-3 shrink-0 self-center border-t border-dashed border-tss-border sm:block" />
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      {rfqRows.length > 0 ? (
        <Panel>
          <div className="border-b border-tss-border px-4 py-3 text-sm font-semibold text-tss-navy">
            Supplier RFQ acknowledgements
          </div>
          <table className="w-full text-sm">
            <thead className="bg-tss-steel-soft/40 text-left text-xs uppercase text-tss-slate">
              <tr>
                <th className="px-4 py-2">RFQ</th>
                <th className="px-4 py-2">Supplier</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Sent</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rfqRows.map((r) => (
                <tr key={r.id} className="border-t border-tss-border/70">
                  <td className="px-4 py-2.5 font-mono text-xs">{r.number}</td>
                  <td className="px-4 py-2.5">{r.supplier}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      tone={
                        r.overdue
                          ? "danger"
                          : r.status === "RESPONDED" || r.status === "QUOTED"
                            ? "success"
                            : r.status === "OPENED"
                              ? "warning"
                              : "neutral"
                      }
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-tss-slate">{formatDate(r.sentAt)}</td>
                  <td className="px-4 py-2.5 text-tss-slate">{formatDate(r.dueAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {!r.openedAt && !r.respondedAt ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await markRfqOpened(r.id);
                            router.refresh();
                          })
                        }
                      >
                        Mark opened
                      </Button>
                    ) : null}
                    {!r.respondedAt ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await markRfqAcknowledged(r.id);
                            router.refresh();
                          })
                        }
                      >
                        Ack
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-tss-navy">Activity timeline</h3>
          <ul className="space-y-3">
            {timeline.slice(0, 20).map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-tss-steel" />
                <div className="min-w-0">
                  <div className="text-tss-navy">{e.label}</div>
                  <div className="text-[11px] text-tss-slate">
                    {formatDateTime(e.occurredAt)}
                    {e.notes ? ` · ${e.notes}` : ""}
                  </div>
                </div>
              </li>
            ))}
            {timeline.length === 0 ? (
              <li className="text-sm text-tss-slate">No events yet.</li>
            ) : null}
          </ul>
        </Panel>

        <Panel className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-tss-navy">Add monitor note</h3>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("enquiryId", enquiryId);
              startTransition(async () => {
                await addDocumentNote(fd);
                (e.target as HTMLFormElement).reset();
                router.refresh();
              });
            }}
          >
            <div className="space-y-1">
              <Label>Label</Label>
              <Input name="label" placeholder="e.g. Supplier confirmed receipt" required />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea name="notes" rows={3} placeholder="Optional detail…" />
            </div>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Log note"}
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
