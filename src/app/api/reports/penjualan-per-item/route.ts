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

  const items = await prisma.salesInvoiceItem.findMany({
    where: {
      salesInvoice: {
        companyId,
        status: { not: "VOID" },
        ...(dateFilter ? { transDate: dateFilter } : {}),
      },
    },
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
      salesInvoice: {
        select: {
          id: true,
          invoiceNo: true,
          transDate: true,
          contact: { select: { name: true } },
        },
      },
    },
  });

  // Group by product
  const productMap = new Map<
    string,
    {
      productId: string | null;
      productName: string;
      sku: string;
      unit: string;
      totalQty: number;
      totalNilai: number;
      details: Array<{
        invoiceNo: string;
        transDate: string;
        customerName: string;
        qty: number;
        unitPrice: number;
        lineTotal: number;
      }>;
    }
  >();

  for (const item of items) {
    const key = item.productId ?? `_desc_${item.description}`;
    if (!productMap.has(key)) {
      productMap.set(key, {
        productId: item.productId,
        productName: item.product?.name ?? item.description,
        sku: item.product?.sku ?? "",
        unit: item.product?.unit ?? "pcs",
        totalQty: 0,
        totalNilai: 0,
        details: [],
      });
    }
    const entry = productMap.get(key)!;
    const qty = Number(item.qty);
    const lt = Number(item.lineTotal);
    entry.totalQty += qty;
    entry.totalNilai += lt;
    entry.details.push({
      invoiceNo: item.salesInvoice.invoiceNo,
      transDate: item.salesInvoice.transDate.toISOString(),
      customerName: item.salesInvoice.contact.name,
      qty,
      unitPrice: Number(item.unitPrice),
      lineTotal: lt,
    });
  }

  const rows = Array.from(productMap.values()).sort(
    (a, b) => b.totalNilai - a.totalNilai
  );

  return NextResponse.json({ rows });
}
