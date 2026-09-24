import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/panel";
import { EnquiryForm } from "@/components/enquiries/enquiry-form";

export default async function NewEnquiryPage() {
  const [customers, parts, vessels, templates] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.part.findMany({
      where: { active: true },
      orderBy: { partNumber: "asc" },
      select: {
        id: true,
        partNumber: true,
        description: true,
        unit: true,
        brand: true,
        impaCode: true,
      },
    }),
    prisma.vessel.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.enquiryTemplate.findMany({
      where: { active: true },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="New enquiry"
        description="Capture the customer request with IMPA / brand codes, or start from a template."
      />
      <EnquiryForm
        customers={customers}
        parts={parts}
        vessels={vessels}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          lines: t.lines.map((l) => ({
            partId: l.partId,
            partNumber: l.partNumber,
            description: l.description,
            impaCode: l.impaCode,
            brand: l.brand,
            quantity: Number(l.quantity),
            unit: l.unit,
          })),
        }))}
      />
    </div>
  );
}
