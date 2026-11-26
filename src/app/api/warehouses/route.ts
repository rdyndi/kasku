import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const warehouses = await prisma.warehouse.findMany({
    where: { companyId: session.companyId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ warehouses });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, name, address } = await req.json();
  if (!code?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "Kode dan nama gudang wajib diisi." }, { status: 400 });
  }

  try {
    const warehouse = await prisma.warehouse.create({
      data: {
        companyId: session.companyId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        address: address || null,
      },
    });
    return NextResponse.json({ warehouse }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Kode gudang sudah digunakan." }, { status: 400 });
  }
}
