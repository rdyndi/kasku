import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal } from "@/lib/accounting";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const journals = await prisma.journalEntry.findMany({
    where: { companyId: session.companyId },
    orderBy: [{ transDate: "desc" }, { createdAt: "desc" }],
    include: {
      lines: {
        include: {
          account: { select: { id: true, code: true, name: true } },
          contact: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ journals });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { transDate, memo, lines, entryNo } = body;

    if (!transDate || !memo) {
      return NextResponse.json({ error: "Tanggal dan memo jurnal wajib diisi." }, { status: 400 });
    }

    const entry = await createBalancedJournal({
      companyId: session.companyId,
      transDate: new Date(transDate),
      memo,
      entryNo: entryNo || undefined,
      sourceType: "MANUAL",
      lines,
    });

    return NextResponse.json({ journal: entry }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan jurnal umum." },
      { status: 400 }
    );
  }
}
