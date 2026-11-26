import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal, getNextDocNumber } from "@/lib/accounting";

type BulkType = "SALES_INVOICE" | "PURCHASE_INVOICE" | "EXPENSE";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { type, cashAccountId, paymentDate, reference, items } = body as {
      type: BulkType;
      cashAccountId: string;
      paymentDate: string;
      reference?: string;
      items: Array<{ id: string; amount?: number }>;
    };

    if (!type || !cashAccountId || !paymentDate || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Tipe, akun kas/bank, tanggal transaksi, dan item wajib diisi." },
        { status: 400 }
      );
    }

    const cashAcc = await prisma.account.findFirst({
      where: { id: cashAccountId, companyId: session.companyId, isCashBank: true },
    });
    if (!cashAcc) {
      return NextResponse.json({ error: "Akun kas/bank tidak valid." }, { status: 404 });
    }

    const parsedDate = new Date(paymentDate);
    const methodLabel = reference?.trim() || "Pembayaran Massal";
    let processedCount = 0;
    let skippedCount = 0;
    let totalPaid = 0;

    if (type === "SALES_INVOICE") {
      const arMapping = await prisma.accountMapping.findUnique({
        where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_ar" } },
      });
      if (!arMapping) {
        return NextResponse.json({ error: "Mapping akun Piutang (default_ar) belum diatur." }, { status: 400 });
      }

      for (const item of items) {
        const invoice = await prisma.salesInvoice.findFirst({
          where: { id: item.id, companyId: session.companyId },
        });
        if (!invoice || invoice.status === "PAID" || invoice.status === "VOID") {
          skippedCount++;
          continue;
        }

        const remaining = Number(invoice.balanceDue);
        const requested = item.amount !== undefined ? Number(item.amount) : remaining;
        const payAmount = Math.min(requested, remaining);
        if (!(payAmount > 0)) {
          skippedCount++;
          continue;
        }

        const paymentNo = await getNextDocNumber(session.companyId, "PAY");
        const journal = await createBalancedJournal({
          companyId: session.companyId,
          transDate: parsedDate,
          memo: `Pembayaran Massal Piutang ${invoice.invoiceNo}${reference ? ` (${reference})` : ""}`,
          sourceType: "PAYMENT",
          lines: [
            {
              accountId: cashAccountId,
              contactId: invoice.contactId,
              debit: payAmount,
              credit: 0,
              description: `Terima pembayaran ${invoice.invoiceNo}`,
            },
            {
              accountId: arMapping.accountId,
              contactId: invoice.contactId,
              debit: 0,
              credit: payAmount,
              description: `Pelunasan piutang ${invoice.invoiceNo}`,
            },
          ],
        });

        await prisma.payment.create({
          data: {
            companyId: session.companyId,
            paymentNo,
            direction: "IN",
            contactId: invoice.contactId,
            cashAccountId,
            paymentDate: parsedDate,
            amount: payAmount,
            method: methodLabel,
            journalEntryId: journal.id,
            allocations: {
              create: { targetType: "SALES_INVOICE", targetId: invoice.id, allocatedAmount: payAmount },
            },
          },
        });

        const newPaid = Number(invoice.paidAmount) + payAmount;
        const newBalance = Number(invoice.grandTotal) - newPaid;
        const newStatus = newBalance <= 0.01 ? "PAID" : "PARTIAL";

        await prisma.salesInvoice.update({
          where: { id: invoice.id },
          data: { paidAmount: newPaid, balanceDue: Math.max(newBalance, 0), status: newStatus },
        });

        processedCount++;
        totalPaid += payAmount;
      }
    } else if (type === "PURCHASE_INVOICE") {
      const apMapping = await prisma.accountMapping.findUnique({
        where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_ap" } },
      });
      if (!apMapping) {
        return NextResponse.json({ error: "Mapping akun Utang (default_ap) belum diatur." }, { status: 400 });
      }

      for (const item of items) {
        const invoice = await prisma.purchaseInvoice.findFirst({
          where: { id: item.id, companyId: session.companyId },
        });
        if (!invoice || invoice.status === "PAID" || invoice.status === "VOID") {
          skippedCount++;
          continue;
        }

        const remaining = Number(invoice.balanceDue);
        const requested = item.amount !== undefined ? Number(item.amount) : remaining;
        const payAmount = Math.min(requested, remaining);
        if (!(payAmount > 0)) {
          skippedCount++;
          continue;
        }

        const paymentNo = await getNextDocNumber(session.companyId, "PAY");
        const journal = await createBalancedJournal({
          companyId: session.companyId,
          transDate: parsedDate,
          memo: `Pembayaran Massal Utang ${invoice.billNo}${reference ? ` (${reference})` : ""}`,
          sourceType: "PAYMENT",
          lines: [
            {
              accountId: apMapping.accountId,
              contactId: invoice.contactId,
              debit: payAmount,
              credit: 0,
              description: `Pelunasan utang ${invoice.billNo}`,
            },
            {
              accountId: cashAccountId,
              contactId: invoice.contactId,
              debit: 0,
              credit: payAmount,
              description: `Bayar tagihan ${invoice.billNo}`,
            },
          ],
        });

        await prisma.payment.create({
          data: {
            companyId: session.companyId,
            paymentNo,
            direction: "OUT",
            contactId: invoice.contactId,
            cashAccountId,
            paymentDate: parsedDate,
            amount: payAmount,
            method: methodLabel,
            journalEntryId: journal.id,
            allocations: {
              create: { targetType: "PURCHASE_INVOICE", targetId: invoice.id, allocatedAmount: payAmount },
            },
          },
        });

        const newPaid = Number(invoice.paidAmount) + payAmount;
        const newBalance = Number(invoice.grandTotal) - newPaid;
        const newStatus = newBalance <= 0.01 ? "PAID" : "PARTIAL";

        await prisma.purchaseInvoice.update({
          where: { id: invoice.id },
          data: { paidAmount: newPaid, balanceDue: Math.max(newBalance, 0), status: newStatus },
        });

        processedCount++;
        totalPaid += payAmount;
      }
    } else if (type === "EXPENSE") {
      const utangBiayaAcc = await prisma.account.findFirst({
        where: { companyId: session.companyId, subCategory: "kewajiban_lancar", name: { contains: "Utang Biaya" } },
      });
      const apMapping = await prisma.accountMapping.findUnique({
        where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_ap" } },
      });
      const debitAccountId = utangBiayaAcc?.id || apMapping?.accountId;
      if (!debitAccountId) {
        return NextResponse.json({ error: "Akun Utang Biaya tidak ditemukan." }, { status: 400 });
      }

      const fallbackContact = await prisma.contact.findFirst({
        where: { companyId: session.companyId },
        select: { id: true },
      });

      for (const item of items) {
        const expense = await prisma.expense.findFirst({
          where: { id: item.id, companyId: session.companyId },
        });
        if (!expense || expense.status === "PAID") {
          skippedCount++;
          continue;
        }

        const remaining = Number(expense.grandTotal) - Number(expense.paidAmount);
        const requested = item.amount !== undefined ? Number(item.amount) : remaining;
        const payAmount = Math.min(requested, remaining);
        if (!(payAmount > 0)) {
          skippedCount++;
          continue;
        }

        const paymentNo = await getNextDocNumber(session.companyId, "PAY");
        const journal = await createBalancedJournal({
          companyId: session.companyId,
          transDate: parsedDate,
          memo: `Pembayaran Massal Biaya ${expense.expenseNo}${reference ? ` (${reference})` : ""}`,
          sourceType: "PAYMENT",
          lines: [
            {
              accountId: debitAccountId,
              debit: payAmount,
              credit: 0,
              description: `Pelunasan ${expense.expenseNo}`,
            },
            {
              accountId: cashAccountId,
              debit: 0,
              credit: payAmount,
              description: `Bayar biaya ${expense.expenseNo}`,
            },
          ],
        });

        const contactId = expense.contactId || fallbackContact?.id;
        if (contactId) {
          await prisma.payment.create({
            data: {
              companyId: session.companyId,
              paymentNo,
              direction: "OUT",
              contactId,
              cashAccountId,
              paymentDate: parsedDate,
              amount: payAmount,
              method: methodLabel,
              journalEntryId: journal.id,
              allocations: {
                create: { targetType: "EXPENSE", targetId: expense.id, allocatedAmount: payAmount },
              },
            },
          });
        }

        const newPaid = Number(expense.paidAmount) + payAmount;
        const newBalance = Number(expense.grandTotal) - newPaid;
        await prisma.expense.update({
          where: { id: expense.id },
          data: { paidAmount: newPaid, status: newBalance <= 0.01 ? "PAID" : "OPEN" },
        });

        processedCount++;
        totalPaid += payAmount;
      }
    } else {
      return NextResponse.json({ error: "Tipe pembayaran massal tidak valid." }, { status: 400 });
    }

    return NextResponse.json({ processedCount, skippedCount, totalPaid }, { status: 200 });
  } catch (err: unknown) {
    console.error("Bulk payment error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memproses pembayaran massal." },
      { status: 400 }
    );
  }
}
