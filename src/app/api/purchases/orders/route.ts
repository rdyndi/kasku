import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextDocNumber } from "@/lib/accounting";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.purchaseOrder.findMany({
    where: { companyId: session.companyId },
    include: {
      contact: { select: { id: true, name: true } },
    },
    orderBy: [{ transDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { contactId, transDate, items } = body;

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

    // Compute grandTotal server-side from items
    let grandTotal = 0;
    for (const item of items as Array<{
      productId?: string;
      description: string;
      qty: number;
      unitCost: number;
      taxRate?: number;
    }>) {
      const qty = Number(item.qty) || 0;
      const unitCost = Number(item.unitCost) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const lineSubtotal = qty * unitCost;
      const lineTax = lineSubtotal * (taxRate / 100);
      grandTotal += lineSubtotal + lineTax;
    }

    const poNo = await getNextDocNumber(session.companyId, "PO");

    const order = await prisma.purchaseOrder.create({
      data: {
        companyId: session.companyId,
        poNo,
        contactId,
        transDate: new Date(transDate),
        status: "DRAFT",
        grandTotal,
      },
      include: {
        contact: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat Purchase Order." },
      { status: 400 }
    );
  }
}
