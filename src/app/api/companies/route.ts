import { NextResponse } from "next/server";
import { getSession, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { provisionCompanyDefaults } from "@/lib/seed-company";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.companyUser.findMany({
    where: { userId: session.userId, isActive: true },
    include: { company: { select: { id: true, name: true, isDemo: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    currentCompanyId: session.companyId,
    companies: memberships.map((m) => m.company),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (body.action === "switch") {
      const membership = await prisma.companyUser.findUnique({
        where: {
          companyId_userId: { companyId: body.companyId, userId: session.userId },
        },
        include: { company: true },
      });
      if (!membership || !membership.isActive) {
        return NextResponse.json({ error: "Akses perusahaan tidak ditemukan." }, { status: 403 });
      }
      await setSessionCookie({
        userId: session.userId,
        companyId: membership.companyId,
        email: session.email,
        name: session.name,
      });
      return NextResponse.json({ ok: true, company: membership.company });
    }

    if (body.action === "create") {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json({ error: "Nama perusahaan wajib diisi." }, { status: 400 });
      }
      const withDemo = Boolean(body.withDemo);
      const company = await prisma.company.create({
        data: { name, email: session.email, isDemo: withDemo },
      });
      const ownerRole = await provisionCompanyDefaults(company.id, withDemo);
      await prisma.companyUser.create({
        data: { companyId: company.id, userId: session.userId, roleId: ownerRole.id },
      });
      await setSessionCookie({
        userId: session.userId,
        companyId: company.id,
        email: session.email,
        name: session.name,
      });
      return NextResponse.json({ ok: true, company }, { status: 201 });
    }

    return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });
  } catch (err) {
    console.error("Companies API error:", err);
    return NextResponse.json({ error: "Gagal memproses perusahaan." }, { status: 500 });
  }
}
