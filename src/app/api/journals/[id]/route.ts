import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.journalEntry.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Jurnal tidak ditemukan." }, { status: 404 });

  await prisma.journalEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
