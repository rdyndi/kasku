import { AppShell } from "@/components/AppShell";
import { InventoryClient } from "@/components/InventoryClient";
import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function InventoryPage() {
  const { session, company } = await requirePageSession();
  const today = new Date().toISOString().slice(0, 10);

  const [stocks, movements, warehouses, products] = await Promise.all([
    prisma.warehouseStock.findMany({
      where: { warehouse: { companyId: company.id } },
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        product: { select: { id: true, sku: true, name: true, unit: true, buyPrice: true, sellPrice: true } },
      },
      orderBy: [{ product: { name: "asc" } }],
    }),
    prisma.stockMovement.findMany({
      where: { warehouse: { companyId: company.id } },
      include: {
        warehouse: { select: { id: true, name: true } },
        product: { select: { id: true, sku: true, name: true, unit: true } },
      },
      orderBy: { movementDate: "desc" },
      take: 50,
    }),
    prisma.warehouse.findMany({
      where: { companyId: company.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: { companyId: company.id, trackInventory: true },
      select: { id: true, sku: true, name: true, unit: true, buyPrice: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <InventoryClient
        initialStocks={stocks.map((s) => ({
          id: s.id,
          warehouseId: s.warehouseId,
          productId: s.productId,
          qtyOnHand: Number(s.qtyOnHand),
          avgCost: Number(s.avgCost),
          warehouse: s.warehouse,
          product: {
            ...s.product,
            buyPrice: Number(s.product.buyPrice),
            sellPrice: Number(s.product.sellPrice),
          },
        }))}
        initialMovements={movements.map((m) => ({
          id: m.id,
          sourceType: m.sourceType,
          qtyIn: Number(m.qtyIn),
          qtyOut: Number(m.qtyOut),
          unitCost: Number(m.unitCost),
          movementDate: m.movementDate.toISOString(),
          warehouse: m.warehouse,
          product: m.product,
        }))}
        initialWarehouses={warehouses}
        products={products.map((p) => ({ ...p, buyPrice: Number(p.buyPrice) }))}
        initialDate={today}
      />
    </AppShell>
  );
}
