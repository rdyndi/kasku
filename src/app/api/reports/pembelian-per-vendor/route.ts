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

  const invoices = await prisma.purchaseInvoice.findMany({
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

  // Group by vendor (contact) — totalTransaksi = total kuantitas
  const vendorMap = new Map<
    string,
    {
      contactId: string;
      vendorName: string;
      companyName: string;
      totalTransaksi: number;
      nilaiPembelian: number;
      invoices: Array<{
        id: string;
        billNo: string;
        transDate: string;
        dueDate: string;
        status: string;
        grandTotal: number;
      }>;
    }
  >();

  for (const inv of invoices) {
    const key = inv.contactId;
    if (!vendorMap.has(key)) {
      vendorMap.set(key, {
        contactId: inv.contact.id,
        vendorName: inv.contact.name,
        companyName: inv.contact.companyName ?? "",
        totalTransaksi: 0,
        nilaiPembelian: 0,
        invoices: [],
      });
    }
    const entry = vendorMap.get(key)!;
    const invoiceQty = inv.items.reduce((s, it) => s + Number(it.qty), 0);
    entry.totalTransaksi += invoiceQty;
    entry.nilaiPembelian += Number(inv.grandTotal);
    entry.invoices.push({
      id: inv.id,
      billNo: inv.billNo,
      transDate: inv.transDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      status: inv.status,
      grandTotal: Number(inv.grandTotal),
    });
  }

  const rows = Array.from(vendorMap.values()).sort(
    (a, b) => b.nilaiPembelian - a.nilaiPembelian
  );

  return NextResponse.json({ rows });
}
