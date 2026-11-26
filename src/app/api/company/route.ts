import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    include: {
      numberSequences: true,
      paymentTerms: true,
      taxes: true,
      accountMappings: { include: { account: true } },
    },
  });
  return NextResponse.json({ company });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updated = await prisma.company.update({
    where: { id: session.companyId },
    data: {
      name: body.name,
      npwp: body.npwp ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      address: body.address ?? null,
      lockDate: body.lockDate ? new Date(body.lockDate) : null,
    },
  });

  return NextResponse.json({ company: updated });
}
