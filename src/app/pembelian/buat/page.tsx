import { AppShell } from "@/components/AppShell";
import { BillFormClient } from "@/components/BillFormClient";
import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function NewPurchaseBillPage() {
  const { session, company } = await requirePageSession();
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 30);

  const [seq, contacts, products, terms, taxes] = await Promise.all([
    prisma.numberSequence.findUnique({
      where: { companyId_docType: { companyId: company.id, docType: "BILL" } },
    }),
    prisma.contact.findMany({
      where: { companyId: company.id, type: { contains: "vendor" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { companyId: company.id, isPurchased: true },
      select: { id: true, sku: true, name: true, unit: true, buyPrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.paymentTerm.findMany({ where: { companyId: company.id }, orderBy: { days: "asc" } }),
    prisma.tax.findMany({ where: { companyId: company.id }, orderBy: { rate: "asc" } }),
  ]);

  const previewNo = seq
    ? `${seq.prefix}${String(seq.nextNumber).padStart(seq.padding, "0")}`
    : "BILL-0001";

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <BillFormClient
        key={`create-${previewNo}`}
        mode="create"
        initialNo={previewNo}
        initialContactId=""
        initialTransDate={today.toISOString().slice(0, 10)}
        initialDueDate={due.toISOString().slice(0, 10)}
        contacts={contacts}
        products={products.map((p) => ({ ...p, buyPrice: Number(p.buyPrice) }))}
        terms={terms}
        taxes={taxes.map((t) => ({ id: t.id, name: t.name, rate: Number(t.rate) }))}
      />
    </AppShell>
  );
}
