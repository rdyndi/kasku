import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" },
    include: { category: true },
  });

  return NextResponse.json({ products: products.map(p => ({ ...p, buyPrice: Number(p.buyPrice), sellPrice: Number(p.sellPrice) })) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      sku,
      name,
      type,
      unit,
      buyPrice,
      sellPrice,
      categoryId,
      trackInventory,
      barcode,
      isPurchased,
      isSold,
      purchaseAccountId,
      salesAccountId,
    } = body;
    if (!sku || !name) return NextResponse.json({ error: "SKU dan nama produk wajib diisi." }, { status: 400 });
    const purchased = isPurchased !== false;
    const sold = isSold !== false;
    if (!purchased && !sold) {
      return NextResponse.json({ error: "Pilih minimal satu: Saya membeli atau Saya menjual item ini." }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        companyId: session.companyId,
        sku: String(sku).trim(),
        barcode: barcode || null,
        name: String(name).trim(),
        type: type || "goods",
        unit: unit || "pcs",
        buyPrice: purchased ? Number(buyPrice) || 0 : 0,
        sellPrice: sold ? Number(sellPrice) || 0 : 0,
        isPurchased: purchased,
        isSold: sold,
        purchaseAccountId: purchased ? purchaseAccountId || null : null,
        salesAccountId: sold ? salesAccountId || null : null,
        categoryId: categoryId || null,
        trackInventory: trackInventory !== false,
      },
    });

    // Create default stock if tracked
    if (product.trackInventory) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { companyId: session.companyId, isDefault: true },
      });
      if (warehouse) {
        await prisma.warehouseStock.upsert({
          where: { warehouseId_productId: { warehouseId: warehouse.id, productId: product.id } },
          update: {},
          create: { warehouseId: warehouse.id, productId: product.id, qtyOnHand: 0, avgCost: Number(buyPrice) || 0 },
        });
      }
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error && err.message.includes("Unique") ? "SKU sudah digunakan." : "Gagal menambah produk.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
