import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { provisionCompanyDefaults } from "@/lib/seed-company";

export async function POST(req: Request) {
  try {
    const { name, email, password, companyName, withDemo = true } = await req.json();
    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "Nama, email, password, dan nama perusahaan wajib diisi." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email: normalizedEmail, passwordHash },
    });

    const company = await prisma.company.create({
      data: {
        name: companyName,
        email: normalizedEmail,
        isDemo: Boolean(withDemo),
      },
    });

    const ownerRole = await provisionCompanyDefaults(company.id, Boolean(withDemo));

    await prisma.companyUser.create({
      data: {
        companyId: company.id,
        userId: user.id,
        roleId: ownerRole.id,
      },
    });

    await setSessionCookie({
      userId: user.id,
      companyId: company.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, company }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Gagal mendaftarkan akun." }, { status: 500 });
  }
}
