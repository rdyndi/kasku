import { AppShell } from "@/components/AppShell";
import { ProductsClient } from "@/components/ProductsClient";
import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";


export default async function ProductsPage() {
  const { session, company } = await requirePageSession();

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: company.id },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.productCategory.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <ProductsClient
        initialProducts={products.map((p) => ({
          id: p.id,
          sku: p.sku,
          barcode: p.barcode,
          name: p.name,
          type: p.type,
          unit: p.unit,
          buyPrice: Number(p.buyPrice),
          sellPrice: Number(p.sellPrice),
          isPurchased: p.isPurchased,
          isSold: p.isSold,
          trackInventory: p.trackInventory,
          categoryId: p.categoryId,
          category: p.category,
        }))}
        initialCategories={categories}
      />
    </AppShell>
  );
}
