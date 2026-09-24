import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { buildRfqPdf } from "@/lib/pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rfq = await prisma.supplierRfq.findUnique({
    where: { id },
    include: {
      supplier: true,
      enquiry: { include: { customer: true } },
      lines: { include: { enquiryLine: true } },
    },
  });
  if (!rfq) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await buildRfqPdf(rfq);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${rfq.number}.pdf"`,
    },
  });
}
