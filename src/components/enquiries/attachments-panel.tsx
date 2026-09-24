"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteEnquiryAttachment,
  uploadEnquiryAttachment,
} from "@/app/actions/shipserv";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBytes, formatDate } from "@/lib/utils";
import { Paperclip, Trash2 } from "lucide-react";

type AttachmentRow = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  label: string | null;
  createdAt: Date;
};

export function AttachmentsPanel({
  enquiryId,
  attachments,
}: {
  enquiryId: string;
  attachments: AttachmentRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-tss-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-tss-navy">Attachments</h3>
          <p className="text-xs text-tss-slate">
            Specs, drawings, maker lists — stored with the enquiry.
          </p>
        </div>
        <Paperclip className="h-4 w-4 text-tss-slate" />
      </div>

      <div className="space-y-3 p-4">
        <form
          ref={formRef}
          className="grid gap-3 rounded-md border border-dashed border-tss-border bg-tss-surface/40 p-3 md:grid-cols-[1fr_1.2fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("enquiryId", enquiryId);
            startTransition(async () => {
              await uploadEnquiryAttachment(fd);
              formRef.current?.reset();
              router.refresh();
            });
          }}
        >
          <div className="space-y-1">
            <Label>Label</Label>
            <Input name="label" placeholder="e.g. Maker drawing" />
          </div>
          <div className="space-y-1">
            <Label>File</Label>
            <Input name="file" type="file" required />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>

        {attachments.length === 0 ? (
          <p className="text-sm text-tss-slate">No attachments yet.</p>
        ) : (
          <ul className="divide-y divide-tss-border/70 rounded-md border border-tss-border/70">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <a
                    href={`/api/attachments/${a.id}`}
                    className="font-medium text-tss-steel hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {a.originalName}
                  </a>
                  <div className="text-xs text-tss-slate">
                    {a.label ? `${a.label} · ` : ""}
                    {formatBytes(a.sizeBytes)} · {formatDate(a.createdAt)}
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteEnquiryAttachment(a.id);
                      router.refresh();
                    })
                  }
                >
                  <Trash2 className="h-4 w-4 text-tss-danger" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
