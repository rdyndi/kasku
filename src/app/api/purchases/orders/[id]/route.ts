import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["DRAFT", "ORDERED", "RECEIVED"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  const existing = await prisma.purchaseOrder.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Purchase Order tidak ditemukan." }, { status: 404 });
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Status tidak valid. Gunakan: ${VALID_STATUSES.join(", ")}.` },
        { status: 400 }
      );
    }

    // Enforce progression: DRAFT → ORDERED → RECEIVED
    const statusOrder = ["DRAFT", "ORDERED", "RECEIVED"];
    const currentIdx = statusOrder.indexOf(existing.status);
    const newIdx = statusOrder.indexOf(status);
    if (newIdx < currentIdx) {
      return NextResponse.json(
        { error: "Status tidak dapat di-rollback." },
        { status: 400 }
      );
    }
  }

  const order = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: status ?? existing.status,
    },
    include: {
      contact: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ order });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.purchaseOrder.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Purchase Order tidak ditemukan." }, { status: 404 });
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Hanya Purchase Order berstatus DRAFT yang dapat dihapus." },
      { status: 400 }
    );
  }

  await prisma.purchaseOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
