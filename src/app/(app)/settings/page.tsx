import { getCompanySettings } from "@/lib/documents";
import { requireSession, canManageUsers } from "@/lib/permissions";
import { updateSettings } from "@/app/actions/workflow";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { decimalToNumber } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { UsersManager } from "@/components/account/users-manager";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await requireSession();
  const settings = await getCompanySettings();
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  const isAdmin = canManageUsers(session.user.role);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Company profile, document defaults, and staff access."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/profile">My profile</Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel className="p-4">
          <h2 className="mb-4 text-sm font-semibold text-tss-navy">Company profile</h2>
          <form action={updateSettings} className="space-y-3">
            <fieldset disabled={!isAdmin} className="space-y-3">
              <div className="space-y-1">
                <Label>Company name</Label>
                <Input name="companyName" defaultValue={settings.companyName} />
              </div>
              <div className="space-y-1">
                <Label>Short name</Label>
                <Input name="shortName" defaultValue={settings.shortName} />
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Textarea name="address" defaultValue={settings.address || ""} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input name="phone" defaultValue={settings.phone || ""} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input name="email" defaultValue={settings.email || ""} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Website</Label>
                <Input name="website" defaultValue={settings.website || ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Default currency</Label>
                  <Input name="defaultCurrency" defaultValue={settings.defaultCurrency} />
                </div>
                <div className="space-y-1">
                  <Label>Default margin %</Label>
                  <Input
                    name="defaultMarginPct"
                    type="number"
                    step="any"
                    defaultValue={decimalToNumber(settings.defaultMarginPct)}
                  />
                </div>
              </div>
              {isAdmin ? (
                <Button type="submit">Save company</Button>
              ) : (
                <p className="text-xs text-tss-slate">Only admins can edit company settings.</p>
              )}
            </fieldset>
          </form>
        </Panel>

        <Panel className="p-4">
          <h2 className="mb-4 text-sm font-semibold text-tss-navy">Document number prefixes</h2>
          <form action={updateSettings} className="space-y-3">
            <fieldset disabled={!isAdmin} className="space-y-3">
              <input type="hidden" name="companyName" value={settings.companyName} />
              <input type="hidden" name="shortName" value={settings.shortName} />
              <input type="hidden" name="address" value={settings.address || ""} />
              <input type="hidden" name="phone" value={settings.phone || ""} />
              <input type="hidden" name="email" value={settings.email || ""} />
              <input type="hidden" name="website" value={settings.website || ""} />
              <input type="hidden" name="defaultCurrency" value={settings.defaultCurrency} />
              <input
                type="hidden"
                name="defaultMarginPct"
                value={String(decimalToNumber(settings.defaultMarginPct))}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Enquiry</Label>
                  <Input name="enqPrefix" defaultValue={settings.enqPrefix} />
                </div>
                <div className="space-y-1">
                  <Label>RFQ</Label>
                  <Input name="rfqPrefix" defaultValue={settings.rfqPrefix} />
                </div>
                <div className="space-y-1">
                  <Label>Customer quote</Label>
                  <Input name="quotePrefix" defaultValue={settings.quotePrefix} />
                </div>
                <div className="space-y-1">
                  <Label>Customer PO</Label>
                  <Input name="poPrefix" defaultValue={settings.poPrefix} />
                </div>
                <div className="space-y-1">
                  <Label>Supplier purchase</Label>
                  <Input name="purchasePrefix" defaultValue={settings.purchasePrefix} />
                </div>
              </div>
              <p className="text-xs text-tss-slate">
                Next sequences: ENQ {settings.enqSeq + 1} · RFQ {settings.rfqSeq + 1} · QT{" "}
                {settings.quoteSeq + 1} · CPO {settings.poSeq + 1} · PO {settings.purchaseSeq + 1}
              </p>
              {isAdmin ? <Button type="submit">Save prefixes</Button> : null}
            </fieldset>
          </form>
        </Panel>
      </div>

      {isAdmin ? (
        <UsersManager
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            active: u.active,
            createdAt: u.createdAt,
          }))}
          currentUserId={session.user.id}
        />
      ) : (
        <Panel className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-tss-navy">Staff directory</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-tss-slate">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter((u) => u.active)
                .map((u) => (
                  <tr key={u.id} className="border-t border-tss-border/70">
                    <td className="py-2">{u.name}</td>
                    <td className="py-2 text-tss-slate">{u.email}</td>
                    <td className="py-2">{u.role}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
