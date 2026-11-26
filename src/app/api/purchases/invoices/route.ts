import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal, getNextDocNumber } from "@/lib/accounting";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoices = await prisma.purchaseInvoice.findMany({
    where: { companyId: session.companyId },
    include: {
      contact: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
      },
    },
    orderBy: [{ transDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ invoices });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { contactId, transDate, dueDate, items } = body;

    if (!contactId || !transDate || !dueDate) {
      return NextResponse.json(
        { error: "contactId, transDate, dan dueDate wajib diisi." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Minimal satu item harus diisi." },
        { status: 400 }
      );
    }

    // Verify contact belongs to company
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, companyId: session.companyId },
    });
    if (!contact) {
      return NextResponse.json({ error: "Kontak tidak ditemukan." }, { status: 404 });
    }

    // Fetch account mappings
    const [apMapping, inventoryMapping, taxInMapping] = await Promise.all([
      prisma.accountMapping.findUnique({
        where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_ap" } },
      }),
      prisma.accountMapping.findUnique({
        where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_inventory" } },
      }),
      prisma.accountMapping.findUnique({
        where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_tax_in" } },
      }),
    ]);

    if (!apMapping) {
      return NextResponse.json({ error: "Akun Utang Usaha (default_ap) belum dikonfigurasi." }, { status: 400 });
    }
    if (!inventoryMapping) {
      return NextResponse.json({ error: "Akun Persediaan (default_inventory) belum dikonfigurasi." }, { status: 400 });
    }

    // Get default warehouse for inventory tracking
    const warehouse = await prisma.warehouse.findFirst({
      where: { companyId: session.companyId, isDefault: true },
    });

    // Compute totals and prepare item data
    type ItemInput = {
      productId?: string;
      description: string;
      qty: number;
      unitCost: number;
      taxRate?: number;
    };

    let subtotal = 0;
    let taxTotal = 0;

    const processedItems: Array<{
      productId?: string;
      description: string;
      qty: number;
      unitCost: number;
      taxRate: number;
      lineTotal: number;
      product?: { trackInventory: boolean; name: string };
    }> = [];

    for (const item of items as ItemInput[]) {
      const qty = Number(item.qty) || 0;
      const unitCost = Number(item.unitCost) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const lineSubtotal = qty * unitCost;
      const lineTax = lineSubtotal * (taxRate / 100);
      const lineTotal = lineSubtotal + lineTax;
      subtotal += lineSubtotal;
      taxTotal += lineTax;

      let product: { trackInventory: boolean; name: string } | undefined;
      if (item.productId) {
        const p = await prisma.product.findFirst({
          where: { id: item.productId, companyId: session.companyId },
          select: { trackInventory: true, name: true },
        });
        if (p) product = p;
      }

      processedItems.push({
        productId: item.productId,
        description: item.description,
        qty,
        unitCost,
        taxRate,
        lineTotal,
        product,
      });
    }

    const extraDiscount = Number(body.extraDiscount) || 0;
    const withholding = Number(body.withholding) || 0;
    const extraCharges = (Number(body.shippingFee) || 0) + (Number(body.transactionFee) || 0);
    const downPayment = Number(body.downPayment) || 0;
    const netCost = Math.max(0, subtotal - extraDiscount - withholding + extraCharges);
    const grandTotal = netCost + taxTotal;
    const finalBalanceDue = Math.max(0, grandTotal - downPayment);

    const billNo = await getNextDocNumber(session.companyId, "BILL");

    // Build journal lines
    // Debit: Persediaan / Expense for each item group, Debit: PPN Masukan (if taxTotal > 0), Credit: Utang Usaha
    const journalLines: Array<{ accountId: string; debit: number; credit: number; description?: string; contactId?: string }> = [];

    // Group goods subtotal → inventory account
    // We debit inventory for the full subtotal (all goods+services go to inventory account per spec)
    if (netCost > 0) {
      journalLines.push({
        accountId: inventoryMapping.accountId,
        debit: netCost,
        credit: 0,
        description: `Pembelian - ${billNo}`,
        contactId,
      });
    }

    if (taxTotal > 0 && taxInMapping) {
      journalLines.push({
        accountId: taxInMapping.accountId,
        debit: taxTotal,
        credit: 0,
        description: `PPN Masukan - ${billNo}`,
        contactId,
      });
    }

    journalLines.push({
      accountId: apMapping.accountId,
      debit: 0,
      credit: grandTotal,
      description: `Utang Usaha - ${billNo}`,
      contactId,
    });

    // Create the journal entry first (outside interactive tx to avoid SQLite write-lock deadlock)
    const journal = await createBalancedJournal({
      companyId: session.companyId,
      transDate: new Date(transDate),
      memo: `Faktur Pembelian ${billNo} - ${contact.name}`,
      sourceType: "PURCHASE_INVOICE",
      lines: journalLines,
    });

    // Create invoice + items + stock updates in a transaction
    const result = await prisma.$transaction(async (tx) => {

      // Create the invoice
      const invoice = await tx.purchaseInvoice.create({
        data: {
          companyId: session.companyId,
          billNo,
          contactId,
          transDate: new Date(transDate),
          dueDate: new Date(dueDate),
          status: "OPEN",
          subtotal,
          taxTotal,
          grandTotal,
          paidAmount: downPayment,
          balanceDue: finalBalanceDue,
          journalEntryId: journal.id,
          items: {
            create: processedItems.map((item) => ({
              productId: item.productId || null,
              description: item.description,
              qty: item.qty,
              unitCost: item.unitCost,
              taxRate: item.taxRate,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: {
          contact: { select: { id: true, name: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
      });

      // Handle inventory tracking for each item
      if (warehouse) {
        for (const item of processedItems) {
          if (item.productId && item.product?.trackInventory) {
            // Weighted average cost calculation
            const existingStock = await tx.warehouseStock.findUnique({
              where: { warehouseId_productId: { warehouseId: warehouse.id, productId: item.productId } },
            });

            const prevQty = existingStock ? Number(existingStock.qtyOnHand) : 0;
            const prevAvgCost = existingStock ? Number(existingStock.avgCost) : 0;
            const newQty = prevQty + item.qty;
            const newAvgCost =
              newQty > 0
                ? (prevQty * prevAvgCost + item.qty * item.unitCost) / newQty
                : item.unitCost;

            await tx.warehouseStock.upsert({
              where: { warehouseId_productId: { warehouseId: warehouse.id, productId: item.productId } },
              update: {
                qtyOnHand: newQty,
                avgCost: newAvgCost,
              },
              create: {
                warehouseId: warehouse.id,
                productId: item.productId,
                qtyOnHand: item.qty,
                avgCost: item.unitCost,
              },
            });

            await tx.stockMovement.create({
              data: {
                warehouseId: warehouse.id,
                productId: item.productId,
                sourceType: "PURCHASE",
                sourceId: invoice.id,
                qtyIn: item.qty,
                qtyOut: 0,
                unitCost: item.unitCost,
                movementDate: new Date(transDate),
              },
            });
          }
        }
      }

      return invoice;
    });

    return NextResponse.json({ invoice: result }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat Faktur Pembelian." },
      { status: 400 }
    );
  }
}
