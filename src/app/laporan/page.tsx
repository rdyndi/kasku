import { requirePageSession } from "@/lib/require-page-session";
import { getTrialBalance } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ReportsClient } from "@/components/ReportsClient";


export default async function ReportsPage() {
  const { session, company } = await requirePageSession();
  const { rows, sumTrialDebit, sumTrialCredit } = await getTrialBalance(company.id);

  const accounts = await prisma.account.findMany({
    where: { companyId: company.id },
    orderBy: { code: "asc" },
  });

  const lines = await prisma.journalLine.findMany({
    where: { journalEntry: { companyId: company.id, status: "POSTED" } },
    include: { journalEntry: true, contact: { select: { name: true } } },
    orderBy: [{ journalEntry: { transDate: "asc" } }, { journalEntry: { createdAt: "asc" } }],
  });

  const ledgers = accounts.map((acc) => {
    const accLines = lines.filter((l) => l.accountId === acc.id);
    let running = 0;
    const movements = accLines.map((l) => {
      const d = Number(l.debit);
      const c = Number(l.credit);
      running += acc.normalBalance === "DEBIT" ? d - c : c - d;
      return {
        id: l.id,
        entryNo: l.journalEntry.entryNo,
        transDate: l.journalEntry.transDate.toISOString(),
        memo: l.journalEntry.memo,
        description: l.description,
        contactName: l.contact?.name ?? null,
        debit: d,
        credit: c,
        balance: running,
      };
    });
    return {
      account: {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        normalBalance: acc.normalBalance,
      },
      endingBalance: running,
      movements,
    };
  });

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <ReportsClient
        trialRows={rows}
        sumTrialDebit={sumTrialDebit}
        sumTrialCredit={sumTrialCredit}
        ledgers={ledgers}
      />
    </AppShell>
  );
}
