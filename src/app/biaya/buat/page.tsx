import { AppShell } from "@/components/AppShell";
import { ExpenseFormClient } from "@/components/ExpenseFormClient";
import { requirePageSession } from "@/lib/require-page-session";
import { getTrialBalance } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";


export default async function NewExpensePage() {
  const { session, company } = await requirePageSession();
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 30);

  const [seq, contacts, { rows }] = await Promise.all([
    prisma.numberSequence.findUnique({
      where: { companyId_docType: { companyId: company.id, docType: "EXP" } },
    }),
    prisma.contact.findMany({
      where: { companyId: company.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getTrialBalance(company.id),
  ]);

  const previewNo = seq
    ? `${seq.prefix}${String(seq.nextNumber).padStart(seq.padding, "0")}`
    : "EXP-0001";

  const expenseAccounts = rows
    .filter((r) => r.category === "expense" || r.category === "cogs")
    .map((r) => ({ id: r.id, code: r.code, name: r.name }));

  const cashAccounts = rows
    .filter((r) => r.isCashBank)
    .map((r) => ({ id: r.id, name: r.name, balance: r.endingBalance }));

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <ExpenseFormClient
        mode="create"
        initialNo={previewNo}
        initialContactId=""
        initialTransDate={today.toISOString().slice(0, 10)}
        initialDueDate={due.toISOString().slice(0, 10)}
        contacts={contacts}
        expenseAccounts={expenseAccounts}
        cashAccounts={cashAccounts}
      />
    </AppShell>
  );
}
