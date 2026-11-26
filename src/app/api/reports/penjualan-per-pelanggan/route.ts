import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startStr = searchParams.get("startDate");
  const endStr = searchParams.get("endDate");
  const companyId = session.companyId;

  const dateWhere: Record<string, unknown> = {};
  if (startStr) dateWhere.gte = new Date(startStr);
  if (endStr) dateWhere.lte = new Date(`${endStr}T23:59:59.999Z`);
  const dateFilter = Object.keys(dateWhere).length > 0 ? dateWhere : undefined;

  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      status: { not: "VOID" },
      ...(dateFilter ? { transDate: dateFilter } : {}),
    },
    include: {
      contact: { select: { id: true, name: true, companyName: true } },
      items: true,
    },
    orderBy: { transDate: "desc" },
  });

  // Group by customer — totalTransaksi = total kuantitas
  const customerMap = new Map<
    string,
    {
      contactId: string;
      customerName: string;
      companyName: string;
      totalTransaksi: number;
      nilaiPenjualan: number;
      invoices: Array<{
        id: string;
        invoiceNo: string;
        transDate: string;
        dueDate: string;
        status: string;
        grandTotal: number;
      }>;
    }
  >();

  for (const inv of invoices) {
    const key = inv.contactId;
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        contactId: inv.contact.id,
        customerName: inv.contact.name,
        companyName: inv.contact.companyName ?? "",
        totalTransaksi: 0,
        nilaiPenjualan: 0,
        invoices: [],
      });
    }
    const entry = customerMap.get(key)!;
    const invoiceQty = inv.items.reduce((s, it) => s + Number(it.qty), 0);
    entry.totalTransaksi += invoiceQty;
    entry.nilaiPenjualan += Number(inv.grandTotal);
    entry.invoices.push({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      transDate: inv.transDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      status: inv.status,
      grandTotal: Number(inv.grandTotal),
    });
  }

  const rows = Array.from(customerMap.values()).sort(
    (a, b) => b.nilaiPenjualan - a.nilaiPenjualan
  );

  return NextResponse.json({ rows });
}
