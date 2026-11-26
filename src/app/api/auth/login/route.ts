import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { provisionCompanyDefaults } from "@/lib/seed-company";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Auto-seed demo account on a fresh empty database
    if (normalizedEmail === "demo@kasku.id" && (await prisma.user.count()) === 0) {
      const passwordHash = await bcrypt.hash("demo1234", 10);
      const demoUser = await prisma.user.create({
        data: { name: "Pemilik UMKM Demo", email: "demo@kasku.id", passwordHash },
      });
      const demoCompany = await prisma.company.create({
        data: {
          name: "CV Kasku Nusantara (Demo)",
          email: "admin@kaskunusantara.id",
          phone: "021-555-0199",
          address: "Jl. Kemang Raya No. 88, Jakarta Selatan",
          isDemo: true,
        },
      });
      const ownerRole = await provisionCompanyDefaults(demoCompany.id, true);
      await prisma.companyUser.create({
        data: { companyId: demoCompany.id, userId: demoUser.id, roleId: ownerRole.id },
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        companies: {
          where: { isActive: true },
          include: { company: true },
          take: 1,
        },
      },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    const companyUser = user.companies[0];
    if (!companyUser) {
      return NextResponse.json({ error: "Akun belum terhubung ke perusahaan." }, { status: 403 });
    }

    await setSessionCookie({
      userId: user.id,
      companyId: companyUser.companyId,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      company: companyUser.company,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan saat login." }, { status: 500 });
  }
}
