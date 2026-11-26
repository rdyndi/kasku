import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal, getNextDocNumber } from "@/lib/accounting";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const body = await req.json();
    const { cashAccountId, paymentDate, amount, method } = body;

    if (!cashAccountId || !paymentDate || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Akun kas, tanggal, dan jumlah pembayaran wajib diisi." }, { status: 400 });
    }

    const invoice = await prisma.salesInvoice.findFirst({
      where: { id, companyId: session.companyId },
    });
    if (!invoice) return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });
    if (invoice.status === "PAID" || invoice.status === "VOID") {
      return NextResponse.json({ error: "Tagihan sudah lunas atau dibatalkan." }, { status: 400 });
    }

    const payAmount = Math.min(Number(amount), Number(invoice.balanceDue));
    const arMapping = await prisma.accountMapping.findUnique({
      where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_ar" } },
    });
    if (!arMapping) return NextResponse.json({ error: "Mapping akun Piutang belum diatur." }, { status: 400 });

    const paymentNo = await getNextDocNumber(session.companyId, "PAY");
    const journal = await createBalancedJournal({
      companyId: session.companyId,
      transDate: new Date(paymentDate),
      memo: `Pembayaran Piutang ${invoice.invoiceNo}`,
      sourceType: "PAYMENT",
      lines: [
        { accountId: cashAccountId, contactId: invoice.contactId, debit: payAmount, credit: 0, description: `Terima pembayaran ${invoice.invoiceNo}` },
        { accountId: arMapping.accountId, contactId: invoice.contactId, debit: 0, credit: payAmount, description: `Pelunasan piutang ${invoice.invoiceNo}` },
      ],
    });

    const payment = await prisma.payment.create({
      data: {
        companyId: session.companyId,
        paymentNo,
        direction: "IN",
        contactId: invoice.contactId,
        cashAccountId,
        paymentDate: new Date(paymentDate),
        amount: payAmount,
        method: method || "Transfer Bank",
        journalEntryId: journal.id,
        allocations: {
          create: { targetType: "SALES_INVOICE", targetId: id, allocatedAmount: payAmount },
        },
      },
    });

    const newPaid = Number(invoice.paidAmount) + payAmount;
    const newBalance = Number(invoice.grandTotal) - newPaid;
    const newStatus = newBalance <= 0.01 ? "PAID" : "PARTIAL";

    await prisma.salesInvoice.update({
      where: { id },
      data: { paidAmount: newPaid, balanceDue: Math.max(newBalance, 0), status: newStatus },
    });

    return NextResponse.json({ payment, newStatus }, { status: 201 });
  } catch (err: unknown) {
    console.error("Sales payment error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mencatat pembayaran." },
      { status: 400 }
    );
  }
}
