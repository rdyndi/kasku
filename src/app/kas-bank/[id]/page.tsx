import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CashAccountDetailClient } from "@/components/CashAccountDetailClient";
import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";


export default async function CashAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, company } = await requirePageSession();
  const { id } = await params;
  const now = new Date();

  const [account, accounts, lines] = await Promise.all([
    prisma.account.findFirst({ where: { id, companyId: company.id } }),
    prisma.account.findMany({ where: { companyId: company.id }, orderBy: { code: "asc" } }),
    prisma.journalLine.findMany({
      where: { accountId: id, journalEntry: { companyId: company.id } },
      include: { journalEntry: true },
      orderBy: [{ journalEntry: { transDate: "asc" } }, { journalEntry: { createdAt: "asc" } }],
    }),
  ]);

  if (!account) notFound();

  let running = 0;
  let totalInMonth = 0;
  let totalOutMonth = 0;
  const movements: Array<{
    id: string;
    transDate: string;
    entryNo: string;
    memo: string;
    description: string | null;
    debit: number;
    credit: number;
    runningBalance: number;
    status: string;
  }> = [];

  for (const l of lines) {
    const d = Number(l.debit);
    const c = Number(l.credit);
    if (l.journalEntry.status === "POSTED") {
      running += d - c;
      const dt = new Date(l.journalEntry.transDate);
      if (dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth()) {
        totalInMonth += d;
        totalOutMonth += c;
      }
    }
    movements.push({
      id: l.id,
      transDate: l.journalEntry.transDate.toISOString(),
      entryNo: l.journalEntry.entryNo,
      memo: l.journalEntry.memo,
      description: l.description,
      debit: d,
      credit: c,
      runningBalance: running,
      status: l.journalEntry.status,
    });
  }

  // Display newest first like Kledo, keeping accurate running balances
  const newestFirst = [...movements].reverse();

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <CashAccountDetailClient
        account={{ id: account.id, code: account.code, name: account.name }}
        movements={newestFirst}
        cashAccounts={accounts
          .filter((a) => a.isCashBank)
          .map((a) => ({ id: a.id, code: a.code, name: a.name }))}
        allAccounts={accounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
        summary={{
          balance: running,
          totalInMonth,
          totalOutMonth,
          netMonth: totalInMonth - totalOutMonth,
        }}
        initialDate={now.toISOString().slice(0, 10)}
      />
    </AppShell>
  );
}
