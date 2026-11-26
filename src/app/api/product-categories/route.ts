import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.productCategory.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });

  try {
    const category = await prisma.productCategory.create({
      data: { companyId: session.companyId, name: name.trim() },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Kategori sudah ada." }, { status: 400 });
  }
}
