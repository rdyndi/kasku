import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { InvoiceDetailClient } from "@/components/InvoiceDetailClient";
import { requirePageSession } from "@/lib/require-page-session";
import { getTrialBalance } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";


export default async function SalesInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, company } = await requirePageSession();
  const { id } = await params;

  const [invoice, allocations, { rows }] = await Promise.all([
    prisma.salesInvoice.findFirst({
      where: { id, companyId: company.id },
      include: { contact: true, items: true },
    }),
    prisma.paymentAllocation.findMany({
      where: { targetType: "SALES_INVOICE", targetId: id },
      include: { payment: true },
      orderBy: { payment: { paymentDate: "desc" } },
    }),
    getTrialBalance(company.id),
  ]);

  if (!invoice) notFound();

  const cashAccounts = rows
    .filter((r) => r.isCashBank)
    .map((r) => ({ id: r.id, name: r.name, balance: r.endingBalance }));

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <InvoiceDetailClient
        company={{
          name: company.name,
          address: company.address,
          phone: company.phone,
          email: company.email,
        }}
        invoice={{
          id: invoice.id,
          invoiceNo: invoice.invoiceNo,
          transDate: invoice.transDate.toISOString(),
          dueDate: invoice.dueDate.toISOString(),
          status: invoice.status,
          subtotal: Number(invoice.subtotal),
          taxTotal: Number(invoice.taxTotal),
          grandTotal: Number(invoice.grandTotal),
          paidAmount: Number(invoice.paidAmount),
          balanceDue: Number(invoice.balanceDue),
          notes: invoice.notes,
          contact: invoice.contact,
          items: invoice.items.map((it) => ({
            id: it.id,
            description: it.description,
            qty: Number(it.qty),
            unitPrice: Number(it.unitPrice),
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
