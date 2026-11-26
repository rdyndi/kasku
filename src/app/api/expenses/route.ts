import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal, getNextDocNumber } from "@/lib/accounting";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const expenses = await prisma.expense.findMany({
      where: { companyId: session.companyId },
      include: {
        contact: { select: { id: true, name: true } },
        items: { include: { expense: false } },
      },
      orderBy: { transDate: "desc" },
    });

    const result = expenses.map((e) => ({
      id: e.id,
      expenseNo: e.expenseNo,
      transDate: e.transDate,
      dueDate: e.dueDate,
      status: e.status,
      grandTotal: Number(e.grandTotal),
      paidAmount: Number(e.paidAmount),
      balanceDue: Number(e.grandTotal) - Number(e.paidAmount),
      contact: e.contact,
      itemCount: e.items.length,
      createdAt: e.createdAt,
    }));

    return NextResponse.json({ expenses: result });
  } catch (err) {
    console.error("[GET /api/expenses]", err);
    return NextResponse.json({ error: "Gagal mengambil data biaya." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { contactId, transDate, dueDate, items, payFromAccountId } = body;

    if (!transDate) {
      return NextResponse.json({ error: "Tanggal transaksi wajib diisi." }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Minimal satu item biaya diperlukan." }, { status: 400 });
    }
    for (const item of items) {
      if (!item.accountId || !item.description || Number(item.amount) <= 0) {
        return NextResponse.json(
          { error: "Setiap item harus memiliki akun, deskripsi, dan jumlah > 0." },
          { status: 400 }
        );
      }
    }

    const grandTotal = items.reduce((sum: number, item: { amount: number }) => sum + Number(item.amount), 0);
    const expenseNo = await getNextDocNumber(session.companyId, "EXP");
    const parsedDate = new Date(transDate);

    // Determine credit account
    let creditAccountId: string;

    if (payFromAccountId) {
      // Paying immediately — credit the cash/bank account
      creditAccountId = payFromAccountId;
    } else {
      // Pay later — credit Utang Biaya (kewajiban_lancar) or fallback to default_ap
      const utangBiaya = await prisma.account.findFirst({
        where: {
          companyId: session.companyId,
          subCategory: "kewajiban_lancar",
        },
        orderBy: { code: "asc" },
      });

      if (utangBiaya) {
        creditAccountId = utangBiaya.id;
      } else {
        // Fallback: default_ap mapping
        const mapping = await prisma.accountMapping.findUnique({
          where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_ap" } },
          include: { account: true },
        });
        if (!mapping) {
          return NextResponse.json(
            { error: "Akun Utang Biaya tidak ditemukan. Silakan atur pemetaan akun default_ap." },
            { status: 400 }
          );
        }
        creditAccountId = mapping.accountId;
      }
    }

    // Build journal lines: Debit each expense account, Credit the offset account
    const journalLines = [
      ...items.map((item: { accountId: string; description: string; amount: number }) => ({
        accountId: item.accountId,
        contactId: contactId || null,
        debit: Number(item.amount),
        credit: 0,
        description: item.description,
      })),
      {
        accountId: creditAccountId,
        contactId: contactId || null,
        debit: 0,
        credit: grandTotal,
        description: `Biaya ${expenseNo}`,
      },
    ];

    const journalEntry = await createBalancedJournal({
      companyId: session.companyId,
      transDate: parsedDate,
      memo: `Biaya ${expenseNo}${contactId ? "" : ""}`,
      sourceType: "EXPENSE",
      lines: journalLines,
    });

    const status = payFromAccountId ? "PAID" : "OPEN";
    const paidAmount = payFromAccountId ? grandTotal : 0;

    const expense = await prisma.expense.create({
      data: {
        companyId: session.companyId,
        expenseNo,
        contactId: contactId || null,
        transDate: parsedDate,
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
        grandTotal,
        paidAmount,
        journalEntryId: journalEntry.id,
        items: {
          create: items.map((item: { accountId: string; description: string; amount: number }) => ({
            accountId: item.accountId,
            description: item.description,
            amount: Number(item.amount),
          })),
        },
      },
      include: {
        contact: { select: { id: true, name: true } },
        items: true,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/expenses]", err);
    const msg = err instanceof Error ? err.message : "Gagal membuat biaya.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
