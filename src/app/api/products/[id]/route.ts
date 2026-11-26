import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.product.findFirst({ where: { id, companyId: session.companyId } });
  if (!existing) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });

  const purchased = body.isPurchased !== undefined ? Boolean(body.isPurchased) : existing.isPurchased;
  const sold = body.isSold !== undefined ? Boolean(body.isSold) : existing.isSold;
  if (!purchased && !sold) {
    return NextResponse.json({ error: "Pilih minimal satu: Saya membeli atau Saya menjual item ini." }, { status: 400 });
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      sku: body.sku !== undefined ? String(body.sku).trim() : existing.sku,
      barcode: body.barcode !== undefined ? body.barcode || null : existing.barcode,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      type: body.type ?? existing.type,
      unit: body.unit ?? existing.unit,
      buyPrice: purchased ? (body.buyPrice !== undefined ? Number(body.buyPrice) : existing.buyPrice) : 0,
      sellPrice: sold ? (body.sellPrice !== undefined ? Number(body.sellPrice) : existing.sellPrice) : 0,
      isPurchased: purchased,
      isSold: sold,
      categoryId: body.categoryId !== undefined ? body.categoryId || null : existing.categoryId,
      trackInventory: body.trackInventory !== undefined ? Boolean(body.trackInventory) : existing.trackInventory,
    },
  });

  return NextResponse.json({
    product: { ...product, buyPrice: Number(product.buyPrice), sellPrice: Number(product.sellPrice) },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.product.findFirst({ where: { id, companyId: session.companyId } });
  if (!existing) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });

  const usedInSales = await prisma.salesInvoiceItem.count({ where: { productId: id } });
  const usedInPurchases = await prisma.purchaseInvoiceItem.count({ where: { productId: id } });
  if (usedInSales > 0 || usedInPurchases > 0) {
    return NextResponse.json({ error: "Produk sudah dipakai di transaksi, tidak dapat dihapus." }, { status: 400 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
