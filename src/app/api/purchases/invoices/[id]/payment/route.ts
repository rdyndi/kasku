import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal, getNextDocNumber } from "@/lib/accounting";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const { cashAccountId, paymentDate, amount, method } = await req.json();
    if (!cashAccountId || !paymentDate || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Akun kas, tanggal, dan jumlah wajib diisi." }, { status: 400 });
    }

    const invoice = await prisma.purchaseInvoice.findFirst({ where: { id, companyId: session.companyId } });
    if (!invoice) return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });
    if (invoice.status === "PAID" || invoice.status === "VOID") {
      return NextResponse.json({ error: "Tagihan sudah lunas atau dibatalkan." }, { status: 400 });
    }

    const payAmount = Math.min(Number(amount), Number(invoice.balanceDue));
    const apMapping = await prisma.accountMapping.findUnique({
      where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_ap" } },
    });
    if (!apMapping) return NextResponse.json({ error: "Mapping akun Utang belum diatur." }, { status: 400 });

    const paymentNo = await getNextDocNumber(session.companyId, "PAY");
    const journal = await createBalancedJournal({
      companyId: session.companyId,
      transDate: new Date(paymentDate),
      memo: `Pembayaran Utang ${invoice.billNo}`,
      sourceType: "PAYMENT",
      lines: [
        { accountId: apMapping.accountId, contactId: invoice.contactId, debit: payAmount, credit: 0, description: `Pelunasan utang ${invoice.billNo}` },
        { accountId: cashAccountId, contactId: invoice.contactId, debit: 0, credit: payAmount, description: `Bayar tagihan ${invoice.billNo}` },
      ],
    });

    const payment = await prisma.payment.create({
      data: {
        companyId: session.companyId,
        paymentNo,
        direction: "OUT",
        contactId: invoice.contactId,
        cashAccountId,
        paymentDate: new Date(paymentDate),
        amount: payAmount,
        method: method || "Transfer Bank",
        journalEntryId: journal.id,
        allocations: {
          create: { targetType: "PURCHASE_INVOICE", targetId: id, allocatedAmount: payAmount },
        },
      },
    });

    const newPaid = Number(invoice.paidAmount) + payAmount;
    const newBalance = Number(invoice.grandTotal) - newPaid;
    await prisma.purchaseInvoice.update({
      where: { id },
      data: { paidAmount: newPaid, balanceDue: Math.max(newBalance, 0), status: newBalance <= 0.01 ? "PAID" : "PARTIAL" },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal membayar." }, { status: 400 });
  }
}
