import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrialBalance } from "@/lib/accounting";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tb = await getTrialBalance(session.companyId);
  return NextResponse.json({ accounts: tb.rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { code, name, category, subCategory, normalBalance, isCashBank, description } = body;
    if (!code || !name || !category) {
      return NextResponse.json({ error: "Kode, nama, dan kategori akun wajib diisi." }, { status: 400 });
    }

    const derivedNormal =
      normalBalance ||
      (["asset", "cogs", "expense"].includes(category) ? "DEBIT" : "CREDIT");

    const account = await prisma.account.create({
      data: {
        companyId: session.companyId,
        code: String(code).trim(),
        name: String(name).trim(),
        category,
        subCategory: subCategory || null,
        normalBalance: derivedNormal,
        isCashBank: Boolean(isCashBank),
        description: description || null,
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error && err.message.includes("Unique")
      ? "Kode akun sudah digunakan."
      : "Gagal menambah akun.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
