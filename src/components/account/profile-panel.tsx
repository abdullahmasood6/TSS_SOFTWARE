"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeMyPassword, updateMyProfile } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/lib/status";
import type { EnquiryStatus } from "@prisma/client";

type WorkItem = {
  id: string;
  number: string;
  subject: string | null;
  vesselName: string | null;
  status: EnquiryStatus;
  priority: string;
  updatedAt: Date;
  customer: { name: string };
};

export function ProfilePanel({
  user,
  stats,
  myEnquiries,
}: {
  user: { id: string; name: string; email: string; role: string; createdAt: Date };
  stats: {
    ownedOpen: number;
    ownedTotal: number;
    quotesCreated: number;
    rfqsSent: number;
  };
  myEnquiries: WorkItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [name, setName] = useState(user.name);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Open (owned)", value: stats.ownedOpen },
          { label: "Total owned", value: stats.ownedTotal },
          { label: "Quotes created", value: stats.quotesCreated },
          { label: "RFQs sent", value: stats.rfqsSent },
        ].map((k) => (
          <Panel key={k.label} className="p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-tss-slate">
              {k.label}
            </div>
            <div className="mt-1 text-2xl font-semibold text-tss-navy">{k.value}</div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-4">
          <h2 className="mb-1 text-sm font-semibold text-tss-navy">Profile</h2>
          <p className="mb-4 text-xs text-tss-slate">
            Your display name appears on owned enquiries and the sidebar.
          </p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setProfileErr("");
              setProfileMsg("");
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                try {
                  await updateMyProfile(fd);
                  setProfileMsg("Profile saved. Sign out/in to refresh the session name.");
                  router.refresh();
                } catch (err) {
                  setProfileErr(err instanceof Error ? err.message : "Failed");
                }
              });
            }}
          >
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="info">{user.role}</Badge>
              <span className="text-xs text-tss-slate">
                Member since {formatDate(user.createdAt)}
              </span>
            </div>
            {profileErr ? <p className="text-sm text-tss-danger">{profileErr}</p> : null}
            {profileMsg ? <p className="text-sm text-tss-success">{profileMsg}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </Panel>

        <Panel className="p-4">
          <h2 className="mb-1 text-sm font-semibold text-tss-navy">Change password</h2>
          <p className="mb-4 text-xs text-tss-slate">Minimum 8 characters.</p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setPwErr("");
              setPwMsg("");
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                try {
                  await changeMyPassword(fd);
                  setPwMsg("Password updated.");
                  e.currentTarget.reset();
                } catch (err) {
                  setPwErr(err instanceof Error ? err.message : "Failed");
                }
              });
            }}
          >
            <div className="space-y-1">
              <Label>Current password</Label>
              <Input name="currentPassword" type="password" required autoComplete="current-password" />
            </div>
            <div className="space-y-1">
              <Label>New password</Label>
              <Input name="newPassword" type="password" required autoComplete="new-password" />
            </div>
            <div className="space-y-1">
              <Label>Confirm new password</Label>
              <Input name="confirmPassword" type="password" required autoComplete="new-password" />
            </div>
            {pwErr ? <p className="text-sm text-tss-danger">{pwErr}</p> : null}
            {pwMsg ? <p className="text-sm text-tss-success">{pwMsg}</p> : null}
            <Button type="submit" disabled={pending}>
              Update password
            </Button>
          </form>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center justify-between border-b border-tss-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-tss-navy">My open enquiries</h2>
            <p className="text-xs text-tss-slate">Enquiries you own that are still in process.</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/enquiries?mine=1">View all mine</Link>
          </Button>
        </div>
        {myEnquiries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-tss-slate">No open enquiries assigned to you.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-tss-steel-soft/40 text-left text-xs uppercase text-tss-slate">
              <tr>
                <th className="px-4 py-2">Number</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {myEnquiries.map((e) => (
                <tr key={e.id} className="border-t border-tss-border/70">
                  <td className="px-4 py-2.5">
                    <Link href={`/enquiries/${e.id}`} className="font-medium text-tss-steel hover:underline">
                      {e.number}
                    </Link>
                    {e.priority === "URGENT" ? (
                      <Badge tone="danger" className="ml-2">
                        Urgent
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">{e.customer.name}</td>
                  <td className="px-4 py-2.5">
                    <div>{e.vesselName || "—"}</div>
                    <div className="text-xs text-tss-slate">{e.subject || ""}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="px-4 py-2.5 text-tss-slate">{formatDate(e.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
