import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const transfer = await prisma.cashTransfer.findFirst({ where: { id, companyId: session.companyId } });
  if (!transfer) return NextResponse.json({ error: "Transfer tidak ditemukan." }, { status: 404 });

  if (transfer.journalEntryId) {
    await prisma.journalEntry.delete({ where: { id: transfer.journalEntryId } });
  }
  await prisma.cashTransfer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
