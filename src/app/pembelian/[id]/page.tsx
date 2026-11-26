import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BillDetailClient } from "@/components/BillDetailClient";
import { requirePageSession } from "@/lib/require-page-session";
import { getTrialBalance } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";


export default async function PurchaseBillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, company } = await requirePageSession();
  const { id } = await params;

  const [bill, allocations, { rows }] = await Promise.all([
    prisma.purchaseInvoice.findFirst({
      where: { id, companyId: company.id },
      include: { contact: true, items: true },
    }),
    prisma.paymentAllocation.findMany({
      where: { targetType: "PURCHASE_INVOICE", targetId: id },
      include: { payment: true },
      orderBy: { payment: { paymentDate: "desc" } },
    }),
    getTrialBalance(company.id),
  ]);

  if (!bill) notFound();

  const cashAccounts = rows
    .filter((r) => r.isCashBank)
    .map((r) => ({ id: r.id, name: r.name, balance: r.endingBalance }));

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <BillDetailClient
        company={{
          name: company.name,
          address: company.address,
          phone: company.phone,
          email: company.email,
        }}
        bill={{
          id: bill.id,
          billNo: bill.billNo,
          transDate: bill.transDate.toISOString(),
          dueDate: bill.dueDate.toISOString(),
          status: bill.status,
          subtotal: Number(bill.subtotal),
          taxTotal: Number(bill.taxTotal),
          grandTotal: Number(bill.grandTotal),
          paidAmount: Number(bill.paidAmount),
          balanceDue: Number(bill.balanceDue),
          contact: bill.contact,
          items: bill.items.map((it) => ({
            id: it.id,
            description: it.description,
            qty: Number(it.qty),
            unitCost: Number(it.unitCost),
            taxRate: Number(it.taxRate),
            lineTotal: Number(it.lineTotal),
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
