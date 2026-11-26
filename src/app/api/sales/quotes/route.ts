import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextDocNumber } from "@/lib/accounting";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quotes = await prisma.salesQuote.findMany({
    where: { companyId: session.companyId },
    include: {
      contact: { select: { id: true, name: true } },
    },
    orderBy: [{ transDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ quotes });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { contactId, transDate, expiryDate, notes, items } = body;

    if (!contactId || !transDate) {
      return NextResponse.json(
        { error: "contactId dan transDate wajib diisi." },
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

    // Compute totals server-side
    let subtotal = 0;
    let taxTotal = 0;

    const processedItems = items.map((item: {
      productId?: string;
      description: string;
      qty: number;
      unitPrice: number;
      taxRate?: number;
    }) => {
      const qty = Number(item.qty) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const lineSubtotal = qty * unitPrice;
      const lineTax = lineSubtotal * (taxRate / 100);
      subtotal += lineSubtotal;
      taxTotal += lineTax;
      return { ...item, qty, unitPrice, taxRate, lineSubtotal, lineTax };
    });

    const grandTotal = subtotal + taxTotal;

    const docNo = await getNextDocNumber(session.companyId, "QUO");

    const quote = await prisma.salesQuote.create({
      data: {
        companyId: session.companyId,
        docNo,
        contactId,
        transDate: new Date(transDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: "DRAFT",
        subtotal,
        taxTotal,
        grandTotal,
        notes: notes || null,
      },
      include: {
        contact: { select: { id: true, name: true } },
      },
    });

    // SalesQuote has no items relation in schema — store items in notes if needed
    // The schema doesn't have SalesQuoteItem; items are on SalesInvoice
    // Return the processed items as metadata
    return NextResponse.json({ quote, items: processedItems }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat penawaran." },
      { status: 400 }
    );
  }
}
