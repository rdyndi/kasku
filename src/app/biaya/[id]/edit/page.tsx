import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ExpenseFormClient } from "@/components/ExpenseFormClient";
import { requirePageSession } from "@/lib/require-page-session";
import { getTrialBalance } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { session, company } = await requirePageSession();
  const { id } = await params;

  const [expense, contacts, { rows }] = await Promise.all([
    prisma.expense.findFirst({
      where: { id, companyId: company.id },
      include: { items: true },
    }),
    prisma.contact.findMany({
      where: { companyId: company.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getTrialBalance(company.id),
  ]);

  if (!expense) notFound();

  const expenseAccounts = rows
    .filter((r) => r.category === "expense" || r.category === "cogs")
    .map((r) => ({ id: r.id, code: r.code, name: r.name }));

  const cashAccounts = rows
    .filter((r) => r.isCashBank)
    .map((r) => ({ id: r.id, name: r.name, balance: r.endingBalance }));

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <ExpenseFormClient
        mode="edit"
        expenseId={expense.id}
        initialNo={expense.expenseNo}
        initialContactId={expense.contactId || ""}
        initialTransDate={expense.transDate.toISOString().slice(0, 10)}
        initialDueDate={
          expense.dueDate
            ? expense.dueDate.toISOString().slice(0, 10)
            : expense.transDate.toISOString().slice(0, 10)
        }
        initialItems={expense.items.map((it) => ({
          accountId: it.accountId,
          description: it.description,
          amount: String(Number(it.amount)),
        }))}
        contacts={contacts}
        expenseAccounts={expenseAccounts}
        cashAccounts={cashAccounts}
      />
    </AppShell>
  );
}
