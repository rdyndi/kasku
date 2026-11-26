import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeTypes(input: unknown): string | undefined {
  if (input === undefined) return undefined;
  if (Array.isArray(input)) {
    return input.map((t) => String(t).trim()).filter(Boolean).join(",");
  }
  return String(input || "").trim();
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.contact.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Kontak tidak ditemukan." }, { status: 404 });

  const nextType = normalizeTypes(body.types ?? body.type);
  const phoneCombined =
    body.secondaryPhone !== undefined
      ? body.secondaryPhone
        ? `${body.phone || ""} / ${body.secondaryPhone}`.replace(/^\s*\/\s*/, "")
        : body.phone || null
      : body.phone ?? existing.phone;

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      type: nextType || existing.type,
      name: body.name ?? existing.name,
      companyName: body.companyName ?? existing.companyName,
      email: body.email ?? existing.email,
      phone: phoneCombined,
      npwp: body.npwp ?? existing.npwp,
      address: body.address ?? existing.address,
    },
  });

  return NextResponse.json({ contact });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.contact.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Kontak tidak ditemukan." }, { status: 404 });

  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
