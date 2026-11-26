import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  const accounts = await prisma.account.findMany({
    where: {
      companyId: session.companyId,
      ...(accountId && accountId !== "all" ? { id: accountId } : {}),
    },
    orderBy: { code: "asc" },
  });

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: accounts.map((a) => a.id) },
      journalEntry: { companyId: session.companyId, status: "POSTED" },
    },
    include: {
      journalEntry: true,
      contact: { select: { name: true } },
    },
    orderBy: [{ journalEntry: { transDate: "asc" } }, { journalEntry: { createdAt: "asc" } }],
  });

  const grouped = accounts.map((acc) => {
    const accLines = lines.filter((l) => l.accountId === acc.id);
    let runningBalance = 0;
    const movements = accLines.map((l) => {
      const d = Number(l.debit);
      const c = Number(l.credit);
      runningBalance += acc.normalBalance === "DEBIT" ? d - c : c - d;
      return {
        id: l.id,
        entryNo: l.journalEntry.entryNo,
        transDate: l.journalEntry.transDate,
        memo: l.journalEntry.memo,
        description: l.description,
        contactName: l.contact?.name ?? null,
        debit: d,
        credit: c,
        balance: runningBalance,
      };
    });

    return {
      account: acc,
      endingBalance: runningBalance,
      movements,
    };
  });

  return NextResponse.json({ ledgers: grouped });
}
