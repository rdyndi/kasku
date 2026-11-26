import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cashAccounts = await prisma.account.findMany({
    where: { companyId: session.companyId, isCashBank: true },
    orderBy: { code: "asc" },
  });

  // Compute balances
  const result = await Promise.all(
    cashAccounts.map(async (acc) => {
      const lines = await prisma.journalLine.aggregate({
        where: { accountId: acc.id, journalEntry: { status: "POSTED" } },
        _sum: { debit: true, credit: true },
      });
      const balance = Number(lines._sum.debit || 0) - Number(lines._sum.credit || 0);
      return { id: acc.id, code: acc.code, name: acc.name, balance };
    })
  );

  return NextResponse.json({ accounts: result });
}
