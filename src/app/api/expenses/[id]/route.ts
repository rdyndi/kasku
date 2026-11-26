import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const expense = await prisma.expense.findFirst({
    where: { id, companyId: session.companyId },
    include: { contact: true, items: true },
  });
  if (!expense) return NextResponse.json({ error: "Biaya tidak ditemukan." }, { status: 404 });

  const payments = await prisma.paymentAllocation.findMany({
    where: { targetType: "EXPENSE", targetId: id },
    include: { payment: true },
    orderBy: { payment: { paymentDate: "desc" } },
  });

  return NextResponse.json({
    expense: {
      ...expense,
      grandTotal: Number(expense.grandTotal),
      paidAmount: Number(expense.paidAmount),
      items: expense.items.map((it) => ({ ...it, amount: Number(it.amount) })),
    },
    payments,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.expense.findFirst({ where: { id, companyId: session.companyId } });
  if (!existing) return NextResponse.json({ error: "Biaya tidak ditemukan." }, { status: 404 });
  if (Number(existing.paidAmount) > 0) {
    return NextResponse.json({ error: "Biaya yang sudah dibayar tidak dapat diedit." }, { status: 400 });
  }

  const { contactId, transDate, dueDate, items, payFromAccountId } = await req.json();
  if (!transDate || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Tanggal dan minimal satu item biaya wajib diisi." }, { status: 400 });
  }

  const grandTotal = items.reduce((s: number, it: { amount: number }) => s + Number(it.amount), 0);

  let creditAccountId = payFromAccountId || "";
  if (!creditAccountId) {
    const utangBiaya = await prisma.account.findFirst({
      where: { companyId: session.companyId, subCategory: "kewajiban_lancar" },
      orderBy: { code: "asc" },
    });
    const apMap = await prisma.accountMapping.findUnique({
      where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_ap" } },
    });
    creditAccountId = utangBiaya?.id || apMap?.accountId || "";
  }

  if (existing.journalEntryId && creditAccountId) {
    await prisma.journalLine.deleteMany({ where: { journalEntryId: existing.journalEntryId } });
    await prisma.journalEntry.update({
      where: { id: existing.journalEntryId },
      data: {
        transDate: new Date(transDate),
        memo: `Biaya ${existing.expenseNo}`,
        lines: {
          create: [
            ...items.map((it: { accountId: string; description: string; amount: number }) => ({
              accountId: it.accountId,
              contactId: contactId || null,
              debit: Number(it.amount),
              credit: 0,
              description: it.description,
            })),
            {
              accountId: creditAccountId,
              contactId: contactId || null,
              debit: 0,
              credit: grandTotal,
              description: `Biaya ${existing.expenseNo}`,
            },
          ],
        },
      },
    });
  }

  await prisma.expenseItem.deleteMany({ where: { expenseId: id } });
  const updated = await prisma.expense.update({
    where: { id },
    data: {
      contactId: contactId || null,
      transDate: new Date(transDate),
      dueDate: dueDate ? new Date(dueDate) : null,
      status: payFromAccountId ? "PAID" : "OPEN",
      grandTotal,
      paidAmount: payFromAccountId ? grandTotal : 0,
      items: {
        create: items.map((it: { accountId: string; description: string; amount: number }) => ({
          accountId: it.accountId,
          description: it.description,
          amount: Number(it.amount),
        })),
      },
    },
  });

  return NextResponse.json({ expense: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.expense.findFirst({ where: { id, companyId: session.companyId } });
  if (!existing) return NextResponse.json({ error: "Biaya tidak ditemukan." }, { status: 404 });
  if (Number(existing.paidAmount) > 0 && existing.status === "PAID") {
    // Allow delete only if no payment allocations exist (i.e. not paid via separate payment)
    const allocs = await prisma.paymentAllocation.count({ where: { targetType: "EXPENSE", targetId: id } });
    if (allocs > 0) {
      return NextResponse.json({ error: "Biaya sudah memiliki riwayat pembayaran." }, { status: 400 });
    }
  }

  if (existing.journalEntryId) {
    await prisma.journalEntry.delete({ where: { id: existing.journalEntryId } });
  }
  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
