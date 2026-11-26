import { AppShell } from "@/components/AppShell";
import { ExpensesClient } from "@/components/ExpensesClient";
import { requirePageSession } from "@/lib/require-page-session";
import { getTrialBalance } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function ExpensesPage() {
  const { session, company } = await requirePageSession();
  const today = new Date().toISOString().slice(0, 10);

  const [expenses, contacts, { rows }] = await Promise.all([
    prisma.expense.findMany({
      where: { companyId: company.id },
      include: { contact: { select: { id: true, name: true } } },
      orderBy: [{ transDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.contact.findMany({
      where: { companyId: company.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getTrialBalance(company.id),
  ]);

  const expenseAccounts = rows
    .filter((r) => r.category === "expense" || r.category === "cogs")
    .map((r) => ({ id: r.id, code: r.code, name: r.name }));

  const cashAccounts = rows
    .filter((r) => r.isCashBank)
    .map((r) => ({ id: r.id, name: r.name, balance: r.endingBalance }));

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <ExpensesClient
        expenses={expenses.map((e) => ({
          id: e.id,
          expenseNo: e.expenseNo,
          transDate: e.transDate.toISOString(),
          status: e.status,
          grandTotal: Number(e.grandTotal),
          paidAmount: Number(e.paidAmount),
          contact: e.contact,
        }))}
        contacts={contacts}
        expenseAccounts={expenseAccounts}
        cashAccounts={cashAccounts}
        initialDate={today}
      />
    </AppShell>
  );
}
