import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

function getRange(period: string, startStr?: string | null, endStr?: string | null) {
  const now = new Date();
  if (period === "custom" && startStr && endStr) {
    return { start: new Date(startStr), end: new Date(`${endStr}T23:59:59.999Z`) };
  }
  if (period === "last_month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }
  if (period === "this_year") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  if (period === "last_year") {
    return {
      start: new Date(now.getFullYear() - 1, 0, 1),
      end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
    };
  }
  // Default: this_month
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const widget = searchParams.get("widget") || "expense";
  const period = searchParams.get("period") || "this_month";
  const { start, end } = getRange(period, searchParams.get("start"), searchParams.get("end"));

  if (widget === "expense") {
    const lines = await prisma.journalLine.findMany({
      where: {
        account: { companyId: session.companyId, category: "expense" },
        journalEntry: { companyId: session.companyId, status: "POSTED", transDate: { gte: start, lte: end } },
      },
      include: { account: { select: { name: true } } },
    });

    const map = new Map<string, number>();
    for (const l of lines) {
      const val = Number(l.debit) - Number(l.credit);
      if (val > 0) map.set(l.account.name, (map.get(l.account.name) || 0) + val);
    }
    const slices = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      slices,
      total: slices.reduce((s, x) => s + x.value, 0),
    });
  }

  // Monthly series for cashflow, pl, sales within the selected range
  const months: Array<{ year: number; month: number; label: string }> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endMonth && months.length < 12) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth(), label: MONTH_NAMES[cursor.getMonth()] });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: { companyId: session.companyId, status: "POSTED", transDate: { gte: start, lte: end } },
    },
    include: { journalEntry: { select: { transDate: true } }, account: true },
  });

  if (widget === "cashflow") {
    const series = months.map((m) => {
      let inVal = 0;
      let outVal = 0;
      for (const l of lines) {
        const d = new Date(l.journalEntry.transDate);
        if (d.getFullYear() === m.year && d.getMonth() === m.month && l.account.isCashBank) {
          inVal += Number(l.debit);
          outVal += Number(l.credit);
        }
      }
      return { label: m.label, inVal, outVal, net: inVal - outVal };
    });
    return NextResponse.json({ series });
  }

  if (widget === "pl") {
    const series = months.map((m) => {
      let rev = 0;
      let cogs = 0;
      let exp = 0;
      for (const l of lines) {
        const d = new Date(l.journalEntry.transDate);
        if (d.getFullYear() !== m.year || d.getMonth() !== m.month) continue;
        if (l.account.category === "revenue") rev += Number(l.credit) - Number(l.debit);
        if (l.account.category === "cogs") cogs += Number(l.debit) - Number(l.credit);
        if (l.account.category === "expense") exp += Number(l.debit) - Number(l.credit);
      }
      return { label: m.label, gross: rev - cogs, net: rev - cogs - exp };
    });
    const netProfitYear = series.reduce((s, r) => s + r.net, 0);
    return NextResponse.json({ series, netProfitYear });
  }

  if (widget === "sales") {
    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId: session.companyId, status: { not: "VOID" }, transDate: { gte: start, lte: end } },
      select: { transDate: true, grandTotal: true },
    });
    const series = months.map((m) => {
      const val = invoices
        .filter((i) => {
          const d = new Date(i.transDate);
          return d.getFullYear() === m.year && d.getMonth() === m.month;
        })
        .reduce((s, i) => s + Number(i.grandTotal), 0);
      return { label: m.label, value: val };
    });
    return NextResponse.json({
      series,
      count: invoices.length,
      total: invoices.reduce((s, i) => s + Number(i.grandTotal), 0),
    });
  }

  return NextResponse.json({ error: "Widget tidak dikenal" }, { status: 400 });
}
