import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal, getNextDocNumber } from "@/lib/accounting";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const { cashAccountId, paymentDate, amount } = await req.json();
    if (!cashAccountId || !paymentDate || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Akun kas, tanggal, dan jumlah wajib diisi." }, { status: 400 });
    }

    const expense = await prisma.expense.findFirst({ where: { id, companyId: session.companyId } });
    if (!expense) return NextResponse.json({ error: "Biaya tidak ditemukan." }, { status: 404 });
    if (expense.status === "PAID") {
      return NextResponse.json({ error: "Biaya sudah lunas." }, { status: 400 });
    }

    const remaining = Number(expense.grandTotal) - Number(expense.paidAmount);
    const payAmount = Math.min(Number(amount), remaining);

    // Find the Utang Biaya account
    const utangBiayaAcc = await prisma.account.findFirst({
      where: { companyId: session.companyId, subCategory: "kewajiban_lancar", name: { contains: "Utang Biaya" } },
    });
    const apMapping = await prisma.accountMapping.findUnique({
      where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_ap" } },
    });
    const debitAccountId = utangBiayaAcc?.id || apMapping?.accountId;
    if (!debitAccountId) return NextResponse.json({ error: "Akun Utang Biaya tidak ditemukan." }, { status: 400 });

    const paymentNo = await getNextDocNumber(session.companyId, "PAY");
    const journal = await createBalancedJournal({
      companyId: session.companyId,
      transDate: new Date(paymentDate),
      memo: `Pembayaran Biaya ${expense.expenseNo}`,
      sourceType: "PAYMENT",
      lines: [
        { accountId: debitAccountId, debit: payAmount, credit: 0, description: `Pelunasan ${expense.expenseNo}` },
        { accountId: cashAccountId, debit: 0, credit: payAmount, description: `Bayar biaya ${expense.expenseNo}` },
      ],
    });

    const payment = await prisma.payment.create({
      data: {
        companyId: session.companyId,
        paymentNo,
        direction: "OUT",
        contactId: expense.contactId || session.userId,
        cashAccountId,
        paymentDate: new Date(paymentDate),
        amount: payAmount,
        method: "Transfer Bank",
        journalEntryId: journal.id,
        allocations: {
          create: { targetType: "EXPENSE", targetId: id, allocatedAmount: payAmount },
        },
      },
    });

    const newPaid = Number(expense.paidAmount) + payAmount;
    const newBalance = Number(expense.grandTotal) - newPaid;
    await prisma.expense.update({
      where: { id },
      data: { paidAmount: newPaid, status: newBalance <= 0.01 ? "PAID" : "OPEN" },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal membayar." }, { status: 400 });
  }
}
