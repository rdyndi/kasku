import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal } from "@/lib/accounting";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entry = await prisma.journalEntry.findFirst({
    where: { companyId: session.companyId, sourceType: "OPENING_BALANCE", status: "POSTED" },
    orderBy: { createdAt: "desc" },
    include: { lines: { include: { account: true } } },
  });

  return NextResponse.json({ openingEntry: entry });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { transDate, lines } = await req.json();
    if (!transDate || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json(
        { error: "Tanggal dan minimal 2 baris akun (Debit & Kredit) wajib diisi." },
        { status: 400 }
      );
    }

    const entry = await createBalancedJournal({
      companyId: session.companyId,
      transDate: new Date(transDate),
      memo: "Saldo Awal Neraca",
      sourceType: "OPENING_BALANCE",
      lines: lines.map((l: { accountId: string; debit: number; credit: number }) => ({
        accountId: l.accountId,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: "Saldo awal",
      })),
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan saldo awal." },
      { status: 400 }
    );
  }
}
