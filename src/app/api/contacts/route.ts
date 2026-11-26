import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeTypes(input: unknown): string {
  if (Array.isArray(input)) {
    const clean = input.map((t) => String(t).trim()).filter(Boolean);
    return clean.join(",");
  }
  return String(input || "").trim();
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const contacts = await prisma.contact.findMany({
    where: {
      companyId: session.companyId,
      ...(type && type !== "all" ? { type: { contains: type } } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ contacts });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const normalizedType = normalizeTypes(body.types ?? body.type);
  if (!body.name || !normalizedType) {
    return NextResponse.json({ error: "Nama dan minimal satu tipe kontak wajib diisi." }, { status: 400 });
  }

  const phoneCombined = body.secondaryPhone
    ? `${body.phone || ""} / ${body.secondaryPhone}`.replace(/^\s*\/\s*/, "")
    : body.phone || null;

  const contact = await prisma.contact.create({
    data: {
      companyId: session.companyId,
      type: normalizedType,
      name: String(body.name).trim(),
      companyName: body.companyName || null,
      email: body.email || null,
      phone: phoneCombined,
      npwp: body.npwp || null,
      address: body.address || null,
    },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
