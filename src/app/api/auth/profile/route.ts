import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, setSessionCookie } from "@/lib/auth";

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login ulang." }, { status: 401 });
    }

    const body = await req.json();
    const nameInput = typeof body.name === "string" ? body.name.trim() : undefined;
    const emailInput = typeof body.email === "string" ? body.email.toLowerCase().trim() : undefined;
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    const nextName = nameInput !== undefined && nameInput.length > 0 ? nameInput : user.name;
    const nextEmail = emailInput !== undefined && emailInput.length > 0 ? emailInput : user.email;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
    }

    const isChangingEmail = nextEmail !== user.email;
    const isChangingPassword = newPassword.length > 0;

    if (isChangingEmail || isChangingPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Masukkan password saat ini untuk mengubah email atau password." },
          { status: 400 }
        );
      }
      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        return NextResponse.json({ error: "Password saat ini salah." }, { status: 401 });
      }
    }

    if (isChangingEmail) {
      const existing = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (existing && existing.id !== user.id) {
        return NextResponse.json({ error: "Email sudah digunakan oleh akun lain." }, { status: 409 });
      }
    }

    if (isChangingPassword && newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password baru minimal 6 karakter." },
        { status: 400 }
      );
    }

    const updateData: { name: string; email: string; passwordHash?: string } = {
      name: nextName,
      email: nextEmail,
    };

    if (isChangingPassword) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: { id: true, name: true, email: true },
    });

    await setSessionCookie({
      userId: updated.id,
      companyId: session.companyId,
      email: updated.email,
      name: updated.name,
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json({ error: "Gagal memperbarui akun." }, { status: 500 });
  }
}
