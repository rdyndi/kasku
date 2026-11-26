import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
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
