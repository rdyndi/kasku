import { AppShell } from "@/components/AppShell";
import { CashBankClient } from "@/components/CashBankClient";
import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";


const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

export default async function CashBankPage() {
  const { session, company } = await requirePageSession();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const months: Array<{ year: number; month: number; label: string }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_NAMES[d.getMonth()] });
  }

  const [accounts, journalLines, transfers] = await Promise.all([
    prisma.account.findMany({
      where: { companyId: company.id },
      orderBy: { code: "asc" },
    }),
    prisma.journalLine.findMany({
      where: { journalEntry: { companyId: company.id, status: "POSTED" } },
      include: { journalEntry: { select: { transDate: true } } },
      orderBy: { journalEntry: { transDate: "asc" } },
    }),
    prisma.cashTransfer.findMany({
      where: { companyId: company.id },
      orderBy: [{ transDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const cashAccounts = accounts
    .filter((a) => a.isCashBank)
    .map((acc) => {
      const accLines = journalLines.filter((l) => l.accountId === acc.id);
      const balance = accLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
      const series = months.map((m) => {
        const endOfMonth = new Date(m.year, m.month + 1, 0, 23, 59, 59);
        const val = accLines
          .filter((l) => new Date(l.journalEntry.transDate) <= endOfMonth)
          .reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
        return { label: m.label, value: val };
      });
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        category: acc.category,
        balance,
        series,
      };
    });

  const allAccounts = accounts.map((a) => ({ id: a.id, code: a.code, name: a.name }));

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <CashBankClient
        cashAccounts={cashAccounts}
        allAccounts={allAccounts}
        transfers={transfers.map((t) => ({
          id: t.id,
          docNo: t.docNo,
          type: t.type,
          transDate: t.transDate.toISOString(),
          amount: Number(t.amount),
          memo: t.memo,
        }))}
        initialDate={today}
      />
    </AppShell>
  );
}
