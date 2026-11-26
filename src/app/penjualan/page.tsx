import { AppShell } from "@/components/AppShell";
import { SalesClient } from "@/components/SalesClient";
import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";


export default async function SalesPage() {
  const { session, company } = await requirePageSession();
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 30);
  const [invoices, contacts, products, warehouses] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { companyId: company.id },
      include: { contact: { select: { id: true, name: true } }, items: true },
      orderBy: [{ transDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.contact.findMany({
      where: { companyId: company.id, type: { contains: "customer" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { companyId: company.id, isSold: true },
      select: { id: true, name: true, sku: true, sellPrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({
      where: { companyId: company.id },
      select: { id: true, name: true, isDefault: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <SalesClient
        invoices={invoices.map((invoice) => ({
          id: invoice.id,
          invoiceNo: invoice.invoiceNo,
          transDate: invoice.transDate.toISOString(),
          dueDate: invoice.dueDate.toISOString(),
          status: invoice.status,
          grandTotal: Number(invoice.grandTotal),
          balanceDue: Number(invoice.balanceDue),
          contact: invoice.contact,
          itemCount: invoice.items.length,
        }))}
        contacts={contacts}
        products={products.map((product) => ({ ...product, sellPrice: Number(product.sellPrice) }))}
        warehouses={warehouses}
        initialTransDate={today.toISOString().slice(0, 10)}
        initialDueDate={due.toISOString().slice(0, 10)}
      />
    </AppShell>
  );
}
