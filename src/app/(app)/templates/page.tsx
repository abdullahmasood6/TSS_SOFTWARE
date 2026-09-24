import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/panel";
import { TemplatesManager } from "@/components/master/templates-manager";
import { decimalToNumber } from "@/lib/utils";
import { requirePermission, can } from "@/lib/permissions";

export default async function TemplatesPage() {
  const session = await requirePermission("templates");
  const canEdit = can(session.user.role, "templates.write");

  const [templates, parts] = await Promise.all([
    prisma.enquiryTemplate.findMany({
      where: { active: true },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    }),
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
  ]);

  return (
    <div>
      <PageHeader
        title="Enquiry templates"
        description="Reusable line sets for common vessel enquiries — IMPA and brand included."
      />
      <TemplatesManager canEdit={canEdit}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          lines: t.lines.map((l) => ({
            id: l.id,
            partNumber: l.partNumber,
            description: l.description,
            impaCode: l.impaCode,
            brand: l.brand,
            quantity: decimalToNumber(l.quantity),
            unit: l.unit,
          })),
        }))}
        parts={parts}
      />
    </div>
  );
}
