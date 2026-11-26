import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal, getNextDocNumber } from "@/lib/accounting";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transfers = await prisma.cashTransfer.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ transfers });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { type, fromAccountId, toAccountId, transDate, amount, memo } = await req.json();
    if (!type || !transDate || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Tipe, tanggal, dan jumlah wajib diisi." }, { status: 400 });
    }

    const docNo = await getNextDocNumber(session.companyId, "TRF");
    const amt = Number(amount);

    let debitId: string;
    let creditId: string;
    let memoText: string;

    switch (type) {
      case "TRANSFER":
        if (!fromAccountId || !toAccountId) return NextResponse.json({ error: "Akun asal dan tujuan wajib diisi." }, { status: 400 });
        debitId = toAccountId;
        creditId = fromAccountId;
        memoText = memo || `Transfer Dana ${docNo}`;
        break;
      case "RECEIVE":
        if (!toAccountId || !fromAccountId) return NextResponse.json({ error: "Akun penerima dan sumber wajib diisi." }, { status: 400 });
        debitId = toAccountId;
        creditId = fromAccountId;
        memoText = memo || `Terima Dana ${docNo}`;
        break;
      case "SEND":
        if (!fromAccountId || !toAccountId) return NextResponse.json({ error: "Akun pengirim dan tujuan wajib diisi." }, { status: 400 });
        debitId = toAccountId;
        creditId = fromAccountId;
        memoText = memo || `Kirim Dana ${docNo}`;
        break;
      case "PRIVE":
        if (!fromAccountId || !toAccountId) return NextResponse.json({ error: "Akun kas dan akun prive wajib diisi." }, { status: 400 });
        debitId = toAccountId;
        creditId = fromAccountId;
        memoText = memo || `Prive Pemilik ${docNo}`;
        break;
      default:
        return NextResponse.json({ error: "Tipe transfer tidak valid." }, { status: 400 });
    }

    const journal = await createBalancedJournal({
      companyId: session.companyId,
      transDate: new Date(transDate),
      memo: memoText,
      sourceType: "TRANSFER",
      lines: [
        { accountId: debitId, debit: amt, credit: 0, description: memoText },
        { accountId: creditId, debit: 0, credit: amt, description: memoText },
      ],
    });

    const transfer = await prisma.cashTransfer.create({
      data: {
        companyId: session.companyId,
        docNo,
        type,
        fromAccountId: fromAccountId || null,
        toAccountId: toAccountId || null,
        transDate: new Date(transDate),
        amount: amt,
        memo: memoText,
        journalEntryId: journal.id,
      },
    });

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal membuat transfer." }, { status: 400 });
  }
}
