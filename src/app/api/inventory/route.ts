import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal, getNextDocNumber } from "@/lib/accounting";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [stocks, movements] = await Promise.all([
    prisma.warehouseStock.findMany({
      where: { warehouse: { companyId: session.companyId } },
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        product: { select: { id: true, sku: true, name: true, unit: true, buyPrice: true, sellPrice: true } },
      },
      orderBy: [{ product: { name: "asc" } }],
    }),
    prisma.stockMovement.findMany({
      where: { warehouse: { companyId: session.companyId } },
      include: {
        warehouse: { select: { id: true, name: true } },
        product: { select: { id: true, sku: true, name: true, unit: true } },
      },
      orderBy: { movementDate: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    stocks: stocks.map((s) => ({
      id: s.id,
      warehouseId: s.warehouseId,
      productId: s.productId,
      qtyOnHand: Number(s.qtyOnHand),
      avgCost: Number(s.avgCost),
      warehouse: s.warehouse,
      product: { ...s.product, buyPrice: Number(s.product.buyPrice), sellPrice: Number(s.product.sellPrice) },
    })),
    movements: movements.map((m) => ({
      id: m.id,
      sourceType: m.sourceType,
      qtyIn: Number(m.qtyIn),
      qtyOut: Number(m.qtyOut),
      unitCost: Number(m.unitCost),
      movementDate: m.movementDate,
      warehouse: m.warehouse,
      product: m.product,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "transfer") {
      const { fromWarehouseId, toWarehouseId, productId, qty } = body;
      const transferQty = Number(qty);
      if (!fromWarehouseId || !toWarehouseId || !productId || transferQty <= 0) {
        return NextResponse.json({ error: "Gudang asal, tujuan, produk, dan jumlah > 0 wajib diisi." }, { status: 400 });
      }
      if (fromWarehouseId === toWarehouseId) {
        return NextResponse.json({ error: "Gudang asal dan tujuan harus berbeda." }, { status: 400 });
      }

      const sourceStock = await prisma.warehouseStock.findUnique({
        where: { warehouseId_productId: { warehouseId: fromWarehouseId, productId } },
      });
      const unitCost = sourceStock ? Number(sourceStock.avgCost) : 0;

      await prisma.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId: fromWarehouseId, productId } },
        update: { qtyOnHand: { decrement: transferQty } },
        create: { warehouseId: fromWarehouseId, productId, qtyOnHand: -transferQty, avgCost: unitCost },
      });

      await prisma.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId: toWarehouseId, productId } },
        update: { qtyOnHand: { increment: transferQty } },
        create: { warehouseId: toWarehouseId, productId, qtyOnHand: transferQty, avgCost: unitCost },
      });

      await prisma.stockMovement.createMany({
        data: [
          { warehouseId: fromWarehouseId, productId, sourceType: "TRANSFER", qtyOut: transferQty, unitCost },
          { warehouseId: toWarehouseId, productId, sourceType: "TRANSFER", qtyIn: transferQty, unitCost },
        ],
      });

      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // Default: Stock Adjustment (Penyesuaian Stok / Opname)
    const { warehouseId, productId, newQty, unitCost, transDate, memo } = body;
    if (!warehouseId || !productId || newQty === undefined) {
      return NextResponse.json({ error: "Gudang, produk, dan stok baru wajib diisi." }, { status: 400 });
    }

    const existing = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
    });
    const currentQty = existing ? Number(existing.qtyOnHand) : 0;
    const targetQty = Number(newQty);
    const diff = targetQty - currentQty;

    if (diff === 0) {
      return NextResponse.json({ error: "Stok baru sama dengan stok saat ini." }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    const cost = Number(unitCost) || (existing ? Number(existing.avgCost) : Number(product?.buyPrice || 0));
    const valueChange = Math.abs(diff) * cost;

    await prisma.warehouseStock.upsert({
      where: { warehouseId_productId: { warehouseId, productId } },
      update: { qtyOnHand: targetQty, avgCost: cost },
      create: { warehouseId, productId, qtyOnHand: targetQty, avgCost: cost },
    });

    await prisma.stockMovement.create({
      data: {
        warehouseId,
        productId,
        sourceType: "ADJUSTMENT",
        qtyIn: diff > 0 ? diff : 0,
        qtyOut: diff < 0 ? Math.abs(diff) : 0,
        unitCost: cost,
        movementDate: transDate ? new Date(transDate) : new Date(),
      },
    });

    // Post accounting journal if valueChange > 0
    if (valueChange > 0) {
      const invMap = await prisma.accountMapping.findUnique({
        where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_inventory" } },
      });
      const cogsMap = await prisma.accountMapping.findUnique({
        where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_cogs" } },
      });
      if (invMap && cogsMap) {
        const docNo = await getNextDocNumber(session.companyId, "JRN");
        await createBalancedJournal({
          companyId: session.companyId,
          entryNo: docNo,
          transDate: transDate ? new Date(transDate) : new Date(),
          memo: memo || `Penyesuaian Stok ${product?.name || ""}`,
          sourceType: "ADJUSTMENT",
          lines:
            diff > 0
              ? [
                  { accountId: invMap.accountId, debit: valueChange, credit: 0, description: `Tambah stok ${product?.name}` },
                  { accountId: cogsMap.accountId, debit: 0, credit: valueChange, description: `Selisih opname ${product?.name}` },
                ]
              : [
                  { accountId: cogsMap.accountId, debit: valueChange, credit: 0, description: `Susut/opname ${product?.name}` },
                  { accountId: invMap.accountId, debit: 0, credit: valueChange, description: `Kurang stok ${product?.name}` },
                ],
        });
      }
    }

    return NextResponse.json({ ok: true, diff }, { status: 201 });
  } catch (err: unknown) {
    console.error("Inventory POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memproses inventori." },
      { status: 400 }
    );
  }
}
