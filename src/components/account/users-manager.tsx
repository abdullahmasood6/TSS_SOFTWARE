"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStaffUser,
  setStaffUserActive,
  updateStaffUser,
} from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: Date;
};

const roles = ["ADMIN", "SALES", "PROCUREMENT", "VIEWER"] as const;

export function UsersManager({
  users,
  currentUserId,
}: {
  users: StaffUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "SALES",
    password: "",
    active: "true",
  });

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setForm({ name: "", email: "", role: "SALES", password: "", active: "true" });
    setError("");
  }

  function startEdit(u: StaffUser) {
    setCreating(false);
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      password: "",
      active: u.active ? "true" : "false",
    });
    setError("");
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    startTransition(async () => {
      try {
        if (editing) await updateStaffUser(editing.id, fd);
        else await createStaffUser(fd);
        setCreating(false);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Panel>
        <div className="flex items-center justify-between border-b border-tss-border px-4 py-3">
          <h2 className="text-sm font-semibold text-tss-navy">Staff accounts</h2>
          <Button type="button" size="sm" onClick={startCreate}>
            Add user
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-tss-steel-soft/40 text-left text-xs uppercase text-tss-slate">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-tss-border/70">
                <td className="px-4 py-2.5 font-medium">
                  {u.name}
                  {u.id === currentUserId ? (
                    <span className="ml-1 text-xs text-tss-slate">(you)</span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-tss-slate">{u.email}</td>
                <td className="px-4 py-2.5">
                  <Badge tone="info">{u.role}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={u.active ? "success" : "neutral"}>
                    {u.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(u)}>
                    Edit
                  </Button>
                  {u.id !== currentUserId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await setStaffUserActive(u.id, !u.active);
                          router.refresh();
                        })
                      }
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-tss-navy">
          {editing ? "Edit user" : creating ? "New user" : "User details"}
        </h2>
        {(creating || editing) && (
          <form onSubmit={onSave} className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            {!editing ? (
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={form.email} disabled />
              </div>
            )}
            <div className="space-y-1">
              <Label>Role</Label>
              <select
                className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {editing ? (
              <div className="space-y-1">
                <Label>Active</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-tss-border bg-white px-3 text-sm"
                  value={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.value }))}
                  disabled={editing.id === currentUserId}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>{editing ? "Reset password (optional)" : "Temporary password"}</Label>
              <Input
                type="password"
                required={!editing}
                minLength={editing ? undefined : 8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editing ? "Leave blank to keep" : "Min 8 characters"}
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
                  setCreating(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
        {!creating && !editing ? (
          <p className="text-sm text-tss-slate">Select Edit or Add user to manage staff access.</p>
        ) : null}
      </Panel>
    </div>
  );
}
