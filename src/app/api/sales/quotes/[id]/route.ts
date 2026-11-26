import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED"] as const;
type QuoteStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const quote = await prisma.salesQuote.findFirst({
      where: { id, companyId: session.companyId },
    });
    if (!quote) {
      return NextResponse.json({ error: "Penawaran tidak ditemukan." }, { status: 404 });
    }

    const body = await req.json();
    const { status, contactId, transDate, expiryDate, notes } = body;

    // Validate status transition if provided
    if (status) {
      if (!VALID_STATUSES.includes(status as QuoteStatus)) {
        return NextResponse.json(
          { error: `Status tidak valid. Valid: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }

      const transitions: Record<string, string[]> = {
        DRAFT: ["SENT"],
        SENT: ["ACCEPTED", "REJECTED"],
        ACCEPTED: [],
        REJECTED: [],
      };

      const allowed = transitions[quote.status] ?? [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { error: `Tidak bisa mengubah status dari ${quote.status} ke ${status}.` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.salesQuote.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(contactId ? { contactId } : {}),
        ...(transDate ? { transDate: new Date(transDate) } : {}),
        ...(expiryDate !== undefined
          ? { expiryDate: expiryDate ? new Date(expiryDate) : null }
          : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
      include: {
        contact: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ quote: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui penawaran." },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const quote = await prisma.salesQuote.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!quote) {
    return NextResponse.json({ error: "Penawaran tidak ditemukan." }, { status: 404 });
  }

  if (quote.status === "ACCEPTED") {
    return NextResponse.json(
      { error: "Penawaran yang sudah diterima tidak dapat dihapus." },
      { status: 400 }
    );
  }

  await prisma.salesQuote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
