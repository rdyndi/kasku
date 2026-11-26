import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.$transaction([
    prisma.journalEntry.deleteMany({
      where: { companyId: session.companyId, isDemoData: true },
    }),
    prisma.contact.deleteMany({
      where: { companyId: session.companyId, isDemoData: true },
    }),
    prisma.product.deleteMany({
      where: { companyId: session.companyId, isDemoData: true },
    }),
    prisma.numberSequence.updateMany({
      where: { companyId: session.companyId, docType: "JRN" },
      data: { nextNumber: 1 },
    }),
    prisma.company.update({
      where: { id: session.companyId },
      data: { isDemo: false },
    }),
  ]);

  return NextResponse.json({ ok: true, message: "Data demo berhasil dihapus." });
}
