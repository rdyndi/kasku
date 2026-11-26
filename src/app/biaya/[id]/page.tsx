import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ExpenseDetailClient } from "@/components/ExpenseDetailClient";
import { requirePageSession } from "@/lib/require-page-session";
import { getTrialBalance } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, company } = await requirePageSession();
  const { id } = await params;

  const [expense, allocations, { rows }, accounts] = await Promise.all([
    prisma.expense.findFirst({
      where: { id, companyId: company.id },
      include: { contact: { select: { id: true, name: true } }, items: true },
    }),
    prisma.paymentAllocation.findMany({
      where: { targetType: "EXPENSE", targetId: id },
      include: { payment: true },
      orderBy: { payment: { paymentDate: "desc" } },
    }),
    getTrialBalance(company.id),
    prisma.account.findMany({ where: { companyId: company.id }, select: { id: true, code: true, name: true } }),
  ]);

  if (!expense) notFound();

  const accMap = new Map(accounts.map((a) => [a.id, `${a.code} — ${a.name}`]));
  const cashAccounts = rows
    .filter((r) => r.isCashBank)
    .map((r) => ({ id: r.id, name: r.name, balance: r.endingBalance }));

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <ExpenseDetailClient
        expense={{
          id: expense.id,
          expenseNo: expense.expenseNo,
          transDate: expense.transDate.toISOString(),
          dueDate: expense.dueDate ? expense.dueDate.toISOString() : null,
          status: expense.status,
          grandTotal: Number(expense.grandTotal),
          paidAmount: Number(expense.paidAmount),
          contact: expense.contact,
          items: expense.items.map((it) => ({
            id: it.id,
            accountName: accMap.get(it.accountId) || "Akun Biaya",
            description: it.description,
            amount: Number(it.amount),
          })),
        }}
        payments={allocations.map((a) => ({
          id: a.id,
          allocatedAmount: Number(a.allocatedAmount),
          payment: {
            id: a.payment.id,
            paymentNo: a.payment.paymentNo,
            paymentDate: a.payment.paymentDate.toISOString(),
            amount: Number(a.payment.amount),
            method: a.payment.method,
          },
        }))}
        cashAccounts={cashAccounts}
        initialDate={new Date().toISOString().slice(0, 10)}
      />
    </AppShell>
  );
}
