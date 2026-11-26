import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { DashboardClient, type DashboardPayload } from "@/components/DashboardClient";


const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

function buildAgingBuckets(
  items: Array<{ dueDate: Date; balanceDue: number }>,
  now: Date
) {
  const b = [
    { label: "<1 months", value: 0 },
    { label: "1 months", value: 0 },
    { label: "2 months", value: 0 },
    { label: "3 months", value: 0 },
    { label: "Older", value: 0 },
  ];
  let overdueCount = 0;
  let overdueTotal = 0;
  for (const it of items) {
    const days = Math.floor((now.getTime() - new Date(it.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    if (days > 0) {
      overdueCount += 1;
      overdueTotal += it.balanceDue;
    }
    if (days <= 30) b[0].value += it.balanceDue;
    else if (days <= 60) b[1].value += it.balanceDue;
    else if (days <= 90) b[2].value += it.balanceDue;
    else if (days <= 120) b[3].value += it.balanceDue;
    else b[4].value += it.balanceDue;
  }
  return {
    openCount: items.length,
    openTotal: items.reduce((s, i) => s + i.balanceDue, 0),
    overdueCount,
    overdueTotal,
    buckets: b,
  };
}

export default async function HomePage() {
  const { session, company } = await requirePageSession();
  const now = new Date();

  // Last 6 months windows
  const months: Array<{ year: number; month: number; label: string }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_NAMES[d.getMonth()] });
  }

  const [accounts, journalLines, openSales, openPurchases, openExpenses, allSales] = await Promise.all([
    prisma.account.findMany({
      where: { companyId: company.id },
      orderBy: { code: "asc" },
    }),
    prisma.journalLine.findMany({
      where: { journalEntry: { companyId: company.id, status: "POSTED" } },
      include: { journalEntry: { select: { transDate: true } }, account: true },
      orderBy: { journalEntry: { transDate: "asc" } },
    }),
    prisma.salesInvoice.findMany({
      where: { companyId: company.id, status: { in: ["OPEN", "PARTIAL"] } },
      select: { dueDate: true, balanceDue: true, transDate: true },
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId: company.id, status: { in: ["OPEN", "PARTIAL"] } },
      select: { dueDate: true, balanceDue: true, transDate: true },
    }),
    prisma.expense.findMany({
      where: { companyId: company.id, status: { not: "PAID" } },
      select: { dueDate: true, transDate: true, grandTotal: true, paidAmount: true },
    }),
    prisma.salesInvoice.findMany({
      where: { companyId: company.id, status: { not: "VOID" } },
      select: { transDate: true, grandTotal: true },
    }),
  ]);

  const cashAccounts = accounts.filter((a) => a.isCashBank);

  // 1. Per-cash-account running balance over 6 months
  const cashWidgets: DashboardPayload["cashWidgets"] = cashAccounts.map((acc) => {
    const accLines = journalLines.filter((l) => l.accountId === acc.id);
    const totalBalance = accLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
    const series = months.map((m) => {
      const endOfMonth = new Date(m.year, m.month + 1, 0, 23, 59, 59);
      const val = accLines
        .filter((l) => new Date(l.journalEntry.transDate) <= endOfMonth)
        .reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
      return { label: m.label, value: val };
    });
    return { id: acc.id, code: acc.code, name: acc.name, balance: totalBalance, series };
  });

  // 2. Aging (include unpaid PurchaseInvoices + unpaid Expenses)
  const openPayables = [
    ...openPurchases.map((p) => ({
      dueDate: p.dueDate,
      transDate: p.transDate,
      balanceDue: Number(p.balanceDue),
    })),
    ...openExpenses
      .map((e) => ({
        dueDate: e.dueDate ?? e.transDate,
        transDate: e.transDate,
        balanceDue: Math.max(0, Number(e.grandTotal) - Number(e.paidAmount)),
      }))
      .filter((e) => e.balanceDue > 0),
  ];

  const apAging = buildAgingBuckets(openPayables, now);
  const arAging = buildAgingBuckets(
    openSales.map((s) => ({ dueDate: s.dueDate, balanceDue: Number(s.balanceDue) })),
    now
  );

  // 3. Expense Breakdown (current month + fallback all time if current month empty)
  const thisMonthExpenses = new Map<string, number>();
  for (const l of journalLines) {
    if (l.account.category !== "expense") continue;
    const d = new Date(l.journalEntry.transDate);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      const val = Number(l.debit) - Number(l.credit);
      if (val > 0) thisMonthExpenses.set(l.account.name, (thisMonthExpenses.get(l.account.name) || 0) + val);
    }
  }
  const slices = Array.from(thisMonthExpenses.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const expenseBreakdown = {
    slices,
    total: slices.reduce((s, x) => s + x.value, 0),
  };

  // 4. Cash Flow 6 months & Profit/Loss 6 months & Sales 6 months & AR/AP 6 months
  const cashFlowMonthly: DashboardPayload["cashFlowMonthly"] = [];
  const plSeries: DashboardPayload["profitLossMonthly"]["series"] = [];
  const salesSeries: DashboardPayload["salesMonthly"]["series"] = [];
  const arApSeries: DashboardPayload["arApMonthly"]["series"] = [];

  for (const m of months) {
    let cashIn = 0;
    let cashOut = 0;
    let rev = 0;
    let cogs = 0;
    let exp = 0;

    for (const l of journalLines) {
      const d = new Date(l.journalEntry.transDate);
      if (d.getFullYear() !== m.year || d.getMonth() !== m.month) continue;
      if (l.account.isCashBank && l.account.category === "asset") {
        cashIn += Number(l.debit);
        cashOut += Number(l.credit);
      }
      if (l.account.category === "revenue") rev += Number(l.credit) - Number(l.debit);
      if (l.account.category === "cogs") cogs += Number(l.debit) - Number(l.credit);
      if (l.account.category === "expense") exp += Number(l.debit) - Number(l.credit);
    }

    cashFlowMonthly.push({ label: m.label, inVal: cashIn, outVal: cashOut, net: cashIn - cashOut });
    plSeries.push({ label: m.label, gross: rev - cogs, net: rev - cogs - exp });

    const monthSales = allSales
      .filter((s) => {
        const d = new Date(s.transDate);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      })
      .reduce((sum, s) => sum + Number(s.grandTotal), 0);
    salesSeries.push({ label: m.label, value: monthSales });

    const monthAr = openSales
      .filter((s) => {
        const d = new Date(s.transDate);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      })
      .reduce((sum, s) => sum + Number(s.balanceDue), 0);
    const monthAp = openPayables
      .filter((p) => {
        const d = new Date(p.transDate);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      })
      .reduce((sum, p) => sum + p.balanceDue, 0);
    arApSeries.push({ label: m.label, ar: monthAr, ap: monthAp, net: monthAr - monthAp });
  }

  const netProfitYear = journalLines
    .filter((l) => new Date(l.journalEntry.transDate).getFullYear() === now.getFullYear())
    .reduce((s, l) => {
      if (l.account.category === "revenue") return s + (Number(l.credit) - Number(l.debit));
      if (l.account.category === "cogs" || l.account.category === "expense") {
        return s - (Number(l.debit) - Number(l.credit));
      }
      return s;
    }, 0);

  // 5. Net Pergerakan Akun (Kas/Bank + Piutang + Utang)
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const netAccountMovements = accounts
    .filter((a) => a.isCashBank || a.subCategory === "piutang" || a.subCategory === "utang_usaha")
    .map((acc) => {
      const calc = (fn: (d: Date) => boolean) =>
        journalLines
          .filter((l) => l.accountId === acc.id && fn(new Date(l.journalEntry.transDate)))
          .reduce(
            (s, l) =>
              s + (acc.normalBalance === "DEBIT" ? Number(l.debit) - Number(l.credit) : Number(l.credit) - Number(l.debit)),
            0
          );
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        thisMonth: calc((d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()),
        thisYear: calc((d) => d.getFullYear() === now.getFullYear()),
        lastMonth: calc((d) => d.getFullYear() === prevMonthDate.getFullYear() && d.getMonth() === prevMonthDate.getMonth()),
      };
    });

  const thisMonthSalesList = allSales.filter((s) => {
    const d = new Date(s.transDate);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const payload: DashboardPayload = {
    cashWidgets,
    apAging,
    arAging,
    expenseBreakdown,
    cashFlowMonthly,
    profitLossMonthly: { netProfitYear, series: plSeries },
    netAccountMovements,
    salesMonthly: {
      thisMonthCount: thisMonthSalesList.length,
      thisMonthTotal: thisMonthSalesList.reduce((s, x) => s + Number(x.grandTotal), 0),
      series: salesSeries,
    },
    arApMonthly: {
      apCount: apAging.openCount,
      apTotal: apAging.openTotal,
      arCount: arAging.openCount,
      arTotal: arAging.openTotal,
      series: arApSeries,
    },
  };

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <DashboardClient
        data={payload}
        companyName={company.name}
        userName={session.name}
      />
    </AppShell>
  );
}
