import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal, getNextDocNumber } from "@/lib/accounting";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoices = await prisma.salesInvoice.findMany({
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
    const { contactId, transDate, dueDate, notes, items, warehouseId } = body;

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

    // Load required account mappings
    const [arMapping, salesMapping, taxOutMapping, cogsMapping, inventoryMapping] =
      await Promise.all([
        prisma.accountMapping.findUnique({
          where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_ar" } },
          include: { account: true },
        }),
        prisma.accountMapping.findUnique({
          where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_sales" } },
          include: { account: true },
        }),
        prisma.accountMapping.findUnique({
          where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_tax_out" } },
          include: { account: true },
        }),
        prisma.accountMapping.findUnique({
          where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_cogs" } },
          include: { account: true },
        }),
        prisma.accountMapping.findUnique({
          where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_inventory" } },
          include: { account: true },
        }),
      ]);

    if (!arMapping) {
      return NextResponse.json(
        { error: "Akun Piutang Usaha (default_ar) belum dikonfigurasi." },
        { status: 400 }
      );
    }
    if (!salesMapping) {
      return NextResponse.json(
        { error: "Akun Pendapatan Penjualan (default_sales) belum dikonfigurasi." },
        { status: 400 }
      );
    }

    // Compute totals and load products
    type ItemInput = {
      productId?: string;
      description: string;
      qty: number;
      unitPrice: number;
      taxRate?: number;
      discount?: number;
    };

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const processedItems: Array<{
      productId?: string;
      description: string;
      qty: number;
      unitPrice: number;
      taxRate: number;
      lineTotal: number;
    }> = [];

    for (const item of items as ItemInput[]) {
      const qty = Number(item.qty) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const discount = Number(item.discount) || 0;

      const lineSubtotalBeforeDiscount = qty * unitPrice;
      const lineDiscount = lineSubtotalBeforeDiscount * (discount / 100);
      const lineSubtotal = lineSubtotalBeforeDiscount - lineDiscount;
      const lineTax = lineSubtotal * (taxRate / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;

      processedItems.push({
        productId: item.productId || undefined,
        description: item.description,
        qty,
        unitPrice,
        taxRate,
        lineTotal,
      });
    }

    const extraDiscount = Number(body.extraDiscount) || 0;
    const withholding = Number(body.withholding) || 0;
    const extraCharges = (Number(body.shippingFee) || 0) + (Number(body.transactionFee) || 0);
    const downPayment = Number(body.downPayment) || 0;
    const netRevenue = Math.max(0, subtotal - extraDiscount - withholding + extraCharges);
    const grandTotal = netRevenue + taxTotal;
    const finalBalanceDue = Math.max(0, grandTotal - downPayment);

    // Auto-generate invoice number
    const invoiceNo = await getNextDocNumber(session.companyId, "INV");

    // Create invoice and items
    const invoice = await prisma.salesInvoice.create({
      data: {
        companyId: session.companyId,
        invoiceNo,
        contactId,
        transDate: new Date(transDate),
        dueDate: new Date(dueDate),
        status: "OPEN",
        subtotal,
        discountTotal: discountTotal + extraDiscount + withholding,
        taxTotal,
        grandTotal,
        paidAmount: downPayment,
        balanceDue: finalBalanceDue,
        notes: notes || null,
        items: {
          create: processedItems,
        },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, trackInventory: true } },
          },
        },
        contact: { select: { id: true, name: true } },
      },
    });

    // Build main journal lines: Debit AR, Credit Sales, Credit Tax Out
    const journalLines: Array<{
      accountId: string;
      contactId?: string | null;
      debit: number;
      credit: number;
      description?: string | null;
    }> = [
      {
        accountId: arMapping.accountId,
        contactId,
        debit: grandTotal,
        credit: 0,
        description: `Piutang Usaha - ${invoiceNo}`,
      },
      {
        accountId: salesMapping.accountId,
        contactId,
        debit: 0,
        credit: netRevenue,
        description: `Pendapatan Penjualan - ${invoiceNo}`,
      },
    ];

    if (taxTotal > 0 && taxOutMapping) {
      journalLines.push({
        accountId: taxOutMapping.accountId,
        contactId,
        debit: 0,
        credit: taxTotal,
        description: `PPN Keluaran - ${invoiceNo}`,
      });
    } else if (taxTotal > 0 && !taxOutMapping) {
      // Absorb tax into sales line if no tax mapping configured
      // Adjust sales credit to include tax
      journalLines[1].credit += taxTotal;
    }

    const journalEntry = await createBalancedJournal({
      companyId: session.companyId,
      transDate: new Date(transDate),
      memo: `Faktur Penjualan ${invoiceNo} - ${contact.name}`,
      sourceType: "SALES_INVOICE",
      sourceId: invoice.id,
      lines: journalLines,
    });

    // Link journal entry to invoice
    await prisma.salesInvoice.update({
      where: { id: invoice.id },
      data: { journalEntryId: journalEntry.id },
    });

    // Handle inventory tracking per item
    if (warehouseId) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId: session.companyId },
      });

      if (warehouse) {
        for (const item of invoice.items) {
          if (!item.product?.trackInventory || !item.productId) continue;

          // Get current stock
          const stock = await prisma.warehouseStock.findUnique({
            where: { warehouseId_productId: { warehouseId, productId: item.productId } },
          });

          const avgCost = stock ? Number(stock.avgCost) : 0;
          const qty = Number(item.qty);
          const cogsAmount = qty * avgCost;

          // Reduce stock quantity
          await prisma.warehouseStock.upsert({
            where: { warehouseId_productId: { warehouseId, productId: item.productId } },
            update: { qtyOnHand: { decrement: qty } },
            create: {
              warehouseId,
              productId: item.productId,
              qtyOnHand: -qty,
              avgCost: 0,
            },
          });

          // Create stock movement
          await prisma.stockMovement.create({
            data: {
              warehouseId,
              productId: item.productId,
              sourceType: "SALE",
              sourceId: invoice.id,
              qtyIn: 0,
              qtyOut: qty,
              unitCost: avgCost,
              movementDate: new Date(transDate),
            },
          });

          // Post COGS journal only if there's a cost and mappings exist
          if (cogsAmount > 0 && cogsMapping && inventoryMapping) {
            await createBalancedJournal({
              companyId: session.companyId,
              transDate: new Date(transDate),
              memo: `HPP Penjualan ${invoiceNo} - ${item.description}`,
              sourceType: "SALES_INVOICE",
              sourceId: invoice.id,
              lines: [
                {
                  accountId: cogsMapping.accountId,
                  debit: cogsAmount,
                  credit: 0,
                  description: `HPP - ${item.description}`,
                },
                {
                  accountId: inventoryMapping.accountId,
                  debit: 0,
                  credit: cogsAmount,
                  description: `Persediaan keluar - ${item.description}`,
                },
              ],
            });
          }
        }
      }
    }

    // Return fresh invoice with journalEntryId set
    const finalInvoice = await prisma.salesInvoice.findUnique({
      where: { id: invoice.id },
      include: {
        contact: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    return NextResponse.json({ invoice: finalInvoice }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat faktur penjualan." },
      { status: 400 }
    );
  }
}
