import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.account.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

  const updated = await prisma.account.update({
    where: { id },
    data: {
      code: body.code ?? existing.code,
      name: body.name ?? existing.name,
      category: body.category ?? existing.category,
      subCategory: body.subCategory ?? existing.subCategory,
      normalBalance: body.normalBalance ?? existing.normalBalance,
      isCashBank: body.isCashBank !== undefined ? Boolean(body.isCashBank) : existing.isCashBank,
      description: body.description ?? existing.description,
    },
  });

  return NextResponse.json({ account: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.account.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  if (existing.isSystem) {
    return NextResponse.json({ error: "Akun sistem bawaan tidak dapat dihapus." }, { status: 400 });
  }

  const usedCount = await prisma.journalLine.count({ where: { accountId: id } });
  if (usedCount > 0) {
    return NextResponse.json(
      { error: "Akun sudah memiliki transaksi jurnal dan tidak dapat dihapus." },
      { status: 400 }
    );
  }

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
