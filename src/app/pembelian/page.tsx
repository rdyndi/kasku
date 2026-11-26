import { AppShell } from "@/components/AppShell";
import { PurchasesClient } from "@/components/PurchasesClient";
import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function PurchasesPage() {
  const { session, company } = await requirePageSession();
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 30);

  const [invoices, contacts, products] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where: { companyId: company.id },
      include: { contact: { select: { id: true, name: true } }, items: true },
      orderBy: [{ transDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.contact.findMany({
      where: { companyId: company.id, type: { contains: "vendor" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { companyId: company.id, isPurchased: true },
      select: { id: true, name: true, sku: true, buyPrice: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <PurchasesClient
        invoices={invoices.map((inv) => ({
          id: inv.id,
          billNo: inv.billNo,
          transDate: inv.transDate.toISOString(),
          dueDate: inv.dueDate.toISOString(),
          status: inv.status,
          grandTotal: Number(inv.grandTotal),
          balanceDue: Number(inv.balanceDue),
          contact: inv.contact,
          itemCount: inv.items.length,
        }))}
        contacts={contacts}
        products={products.map((p) => ({ ...p, buyPrice: Number(p.buyPrice) }))}
        initialTransDate={today.toISOString().slice(0, 10)}
        initialDueDate={due.toISOString().slice(0, 10)}
      />
    </AppShell>
  );
}
