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

  const items = await prisma.purchaseInvoiceItem.findMany({
    where: {
      purchaseInvoice: {
        companyId,
        status: { not: "VOID" },
        ...(dateFilter ? { transDate: dateFilter } : {}),
      },
    },
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
      purchaseInvoice: {
        select: {
          id: true,
          billNo: true,
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
        billNo: string;
        transDate: string;
        vendorName: string;
        qty: number;
        unitCost: number;
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
      billNo: item.purchaseInvoice.billNo,
      transDate: item.purchaseInvoice.transDate.toISOString(),
      vendorName: item.purchaseInvoice.contact.name,
      qty,
      unitCost: Number(item.unitCost),
      lineTotal: lt,
    });
  }

  const rows = Array.from(productMap.values()).sort(
    (a, b) => b.totalNilai - a.totalNilai
  );

  return NextResponse.json({ rows });
}
