import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/panel";
import { ProfilePanel } from "@/components/account/profile-panel";
import { EnquiryStatus } from "@prisma/client";

const closed: EnquiryStatus[] = [
  EnquiryStatus.COMPLETED,
  EnquiryStatus.CANCELLED,
  EnquiryStatus.REJECTED,
];

export default async function ProfilePage() {
  const session = await requireSession();
  const userId = session.user.id;

  const [user, ownedOpen, ownedTotal, quotesCreated, rfqsSent, myEnquiries] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.enquiry.count({
        where: { ownerId: userId, status: { notIn: closed } },
      }),
      prisma.enquiry.count({ where: { ownerId: userId } }),
      prisma.customerQuote.count({ where: { createdById: userId } }),
      prisma.supplierRfq.count({ where: { createdById: userId } }),
      prisma.enquiry.findMany({
        where: { ownerId: userId, status: { notIn: closed } },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        take: 12,
        include: { customer: { select: { name: true } } },
      }),
    ]);

  return (
    <div>
      <PageHeader
        title="My profile"
        description={`${user.name} · ${user.role} · personal workload and account settings`}
      />
      <ProfilePanel
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        }}
        stats={{ ownedOpen, ownedTotal, quotesCreated, rfqsSent }}
        myEnquiries={myEnquiries}
      />
    </div>
  );
}
