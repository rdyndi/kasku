import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });

  const company = await prisma.company.findUnique({ where: { id: session.companyId } });
  return NextResponse.json({ user: session, company });
}
