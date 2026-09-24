import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { buildPurchasePdf } from "@/lib/pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const purchase = await prisma.supplierPurchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      enquiry: { include: { customer: true } },
      lines: true,
    },
  });
  if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await buildPurchasePdf(purchase);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${purchase.number}.pdf"`,
    },
  });
}
