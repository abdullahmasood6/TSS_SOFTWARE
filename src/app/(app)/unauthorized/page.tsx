import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { requireSession, ROLE_META } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export default async function UnauthorizedPage() {
  const session = await requireSession();
  const meta = ROLE_META[session.user.role as Role];

  return (
    <div className="mx-auto max-w-lg py-16 animate-fade-up">
      <PageHeader
        title="Access restricted"
        description="Your role cannot open this area."
      />
      <Panel className="p-6">
        <p className="text-sm text-tss-slate">
          Signed in as <strong className="text-tss-navy">{session.user.name}</strong> (
          {meta.label}). {meta.summary}
        </p>
        <p className="mt-3 text-sm text-tss-slate">
          Ask an Admin if you need a different role. Typical focus for {meta.label}:{" "}
          {meta.focus.join(", ")}.
        </p>
        <div className="mt-5 flex gap-2">
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/profile">My profile</Link>
          </Button>
        </div>
      </Panel>
    </div>
  );
}
