import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrialBalance } from "@/lib/accounting";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "laba-rugi";
  const startStr = searchParams.get("startDate");
  const endStr = searchParams.get("endDate");
  const startDate = startStr ? new Date(startStr) : undefined;
  const endDate = endStr ? new Date(`${endStr}T23:59:59.999Z`) : undefined;

  const companyId = session.companyId;
  const dateFilter = startDate || endDate ? { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } : undefined;

  if (type === "laba-rugi") {
    const yearParam = Number(searchParams.get("year")) || new Date().getFullYear();
    const compare = searchParams.get("compare") !== "none";

    const curStart = startDate ?? new Date(yearParam, 0, 1);
    const curEnd = endDate ?? new Date(yearParam, 11, 31, 23, 59, 59, 999);
    const prevStart = new Date(yearParam - 1, 0, 1);
    const prevEnd = new Date(yearParam - 1, 11, 31, 23, 59, 59, 999);

    const [curTB, prevTB] = await Promise.all([
      getTrialBalance(companyId, curStart, curEnd),
      compare ? getTrialBalance(companyId, prevStart, prevEnd) : Promise.resolve(null),
    ]);

    const prevMap = new Map<string, number>();
    if (prevTB) {
      for (const r of prevTB.rows) prevMap.set(r.id, r.endingBalance);
    }

    const mergeRows = (cat: string, filterFn?: (r: (typeof curTB.rows)[number]) => boolean) =>
      curTB.rows
        .filter((r) => r.category === cat && (!filterFn || filterFn(r)))
        .map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          current: r.endingBalance,
          previous: prevMap.get(r.id) ?? 0,
        }))
        .filter((r) => r.current !== 0 || r.previous !== 0);

    const revenues = mergeRows("revenue");
    const cogs = mergeRows("cogs");
    const opExpenses = mergeRows("expense", (r) => !r.code.startsWith("8-"));
    const otherExpenses = mergeRows("expense", (r) => r.code.startsWith("8-") && !r.name.toLowerCase().includes("bunga"));
    const financingExpenses = mergeRows("expense", (r) => r.code.startsWith("8-") && r.name.toLowerCase().includes("bunga"));

    const sumCur = (arr: Array<{ current: number }>) => arr.reduce((s, r) => s + r.current, 0);
    const sumPrev = (arr: Array<{ previous: number }>) => arr.reduce((s, r) => s + r.previous, 0);

    const totalRevenue = sumCur(revenues);
    const prevTotalRevenue = sumPrev(revenues);
    const totalCogs = sumCur(cogs);
    const prevTotalCogs = sumPrev(cogs);

    const grossProfit = totalRevenue - totalCogs;
    const prevGrossProfit = prevTotalRevenue - prevTotalCogs;

    const totalOpExpense = sumCur(opExpenses);
    const prevTotalOpExpense = sumPrev(opExpenses);
    const totalOtherExpense = sumCur(otherExpenses);
    const prevTotalOtherExpense = sumPrev(otherExpenses);

    const operatingProfit = grossProfit - totalOpExpense - totalOtherExpense;
    const prevOperatingProfit = prevGrossProfit - prevTotalOpExpense - prevTotalOtherExpense;

    const totalFinancing = sumCur(financingExpenses);
    const prevTotalFinancing = sumPrev(financingExpenses);

    const netProfit = operatingProfit - totalFinancing;
    const prevNetProfit = prevOperatingProfit - prevTotalFinancing;

    return NextResponse.json({
      year: yearParam,
      compare,
      revenues,
      cogs,
      opExpenses,
      otherExpenses,
      financingExpenses,
      totalRevenue,
      prevTotalRevenue,
      totalCogs,
      prevTotalCogs,
      grossProfit,
      prevGrossProfit,
      totalOpExpense,
      prevTotalOpExpense,
      operatingProfit,
      prevOperatingProfit,
      netProfit,
      prevNetProfit,
    });
  }

  if (type === "neraca") {
    const { rows } = await getTrialBalance(companyId, undefined, endDate);
    const assets = rows.filter((r) => r.category === "asset");
    const liabilities = rows.filter((r) => r.category === "liability");
    const equities = rows.filter((r) => r.category === "equity");

    const revenueTotal = rows.filter((r) => r.category === "revenue").reduce((s, r) => s + r.endingBalance, 0);
    const cogsTotal = rows.filter((r) => r.category === "cogs").reduce((s, r) => s + r.endingBalance, 0);
    const expenseTotal = rows.filter((r) => r.category === "expense").reduce((s, r) => s + r.endingBalance, 0);
    const currentYearProfit = revenueTotal - cogsTotal - expenseTotal;

    const totalAssets = assets.reduce((s, r) => s + r.endingBalance, 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + r.endingBalance, 0);
    const totalEquity = equities.reduce((s, r) => s + r.endingBalance, 0) + currentYearProfit;

    return NextResponse.json({
      assets: assets.filter((a) => a.endingBalance !== 0),
      liabilities: liabilities.filter((l) => l.endingBalance !== 0),
      equities: equities.filter((e) => e.endingBalance !== 0),
      currentYearProfit,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    });
  }

  if (type === "arus-kas" || type === "proyeksi-arus-kas") {
    const cashLines = await prisma.journalLine.findMany({
      where: {
        account: { companyId, isCashBank: true, category: "asset" },
        journalEntry: { companyId, status: "POSTED", ...(dateFilter ? { transDate: dateFilter } : {}) },
      },
      include: { journalEntry: true, account: true },
      orderBy: { journalEntry: { transDate: "asc" } },
    });

    let operatingIn = 0;
    let operatingOut = 0;
    let investing = 0;
    let financing = 0;

    for (const l of cashLines) {
      const net = Number(l.debit) - Number(l.credit);
      const src = l.journalEntry.sourceType;
      if (src === "OPENING_BALANCE") {
        financing += net;
      } else if (src === "DEPRECIATION") {
        investing += net;
      } else {
        if (net >= 0) operatingIn += net;
        else operatingOut += Math.abs(net);
      }
    }

    const netCashChange = operatingIn - operatingOut + investing + financing;
    return NextResponse.json({
      operatingIn,
      operatingOut,
      netOperating: operatingIn - operatingOut,
      investing,
      financing,
      netCashChange,
      movements: cashLines.map((l) => ({
        id: l.id,
        date: l.journalEntry.transDate,
        entryNo: l.journalEntry.entryNo,
        memo: l.journalEntry.memo,
        accountName: l.account.name,
        amount: Number(l.debit) - Number(l.credit),
      })),
    });
  }

  if (type === "perubahan-modal") {
    const { rows } = await getTrialBalance(companyId, startDate, endDate);
    const modalDisetor = rows
      .filter((r) => r.category === "equity" && !r.name.toLowerCase().includes("prive"))
      .reduce((s, r) => s + r.endingBalance, 0);
    const prive = rows
      .filter((r) => r.category === "equity" && r.name.toLowerCase().includes("prive"))
      .reduce((s, r) => s + Math.abs(r.endingBalance), 0);
    const rev = rows.filter((r) => r.category === "revenue").reduce((s, r) => s + r.endingBalance, 0);
    const cost = rows
      .filter((r) => r.category === "cogs" || r.category === "expense")
      .reduce((s, r) => s + r.endingBalance, 0);
    const netProfit = rev - cost;
    const endingEquity = modalDisetor + netProfit - prive;

    return NextResponse.json({ modalDisetor, netProfit, prive, endingEquity });
  }

  if (type === "ringkasan-eksekutif" || type === "ringkasan-bank") {
    const { rows } = await getTrialBalance(companyId, startDate, endDate);
    const cashAccounts = rows.filter((r) => r.isCashBank && r.category === "asset");
    const totalCash = cashAccounts.reduce((s, r) => s + r.endingBalance, 0);
    const totalAR = rows.filter((r) => r.code === "1-10100").reduce((s, r) => s + r.endingBalance, 0);
    const totalAP = rows.filter((r) => r.code === "2-20100").reduce((s, r) => s + r.endingBalance, 0);
    const totalInventory = rows.filter((r) => r.code === "1-10200").reduce((s, r) => s + r.endingBalance, 0);
    const rev = rows.filter((r) => r.category === "revenue").reduce((s, r) => s + r.endingBalance, 0);
    const exp = rows
      .filter((r) => r.category === "cogs" || r.category === "expense")
      .reduce((s, r) => s + r.endingBalance, 0);
    return NextResponse.json({
      cashAccounts,
      totalCash,
      totalAR,
      totalAP,
      totalInventory,
      totalRevenue: rev,
      totalExpense: exp,
      netProfit: rev - exp,
    });
  }

  if (type === "hutang-piutang-kontak") {
    const [salesInv, purchInv, openExps] = await Promise.all([
      prisma.salesInvoice.findMany({
        where: { companyId, status: { in: ["OPEN", "PARTIAL"] } },
        include: { contact: { select: { id: true, name: true } } },
      }),
      prisma.purchaseInvoice.findMany({
        where: { companyId, status: { in: ["OPEN", "PARTIAL"] } },
        include: { contact: { select: { id: true, name: true } } },
      }),
      prisma.expense.findMany({
        where: { companyId, status: { not: "PAID" }, contactId: { not: null } },
        include: { contact: { select: { id: true, name: true } } },
      }),
    ]);

    const map = new Map<string, { name: string; piutang: number; hutang: number }>();
    for (const s of salesInv) {
      const cur = map.get(s.contactId) ?? { name: s.contact.name, piutang: 0, hutang: 0 };
      cur.piutang += Number(s.balanceDue);
      map.set(s.contactId, cur);
    }
    for (const p of purchInv) {
      const cur = map.get(p.contactId) ?? { name: p.contact.name, piutang: 0, hutang: 0 };
      cur.hutang += Number(p.balanceDue);
      map.set(p.contactId, cur);
    }
    for (const e of openExps) {
      if (!e.contactId || !e.contact) continue;
      const bal = Math.max(0, Number(e.grandTotal) - Number(e.paidAmount));
      if (bal <= 0) continue;
      const cur = map.get(e.contactId) ?? { name: e.contact.name, piutang: 0, hutang: 0 };
      cur.hutang += bal;
      map.set(e.contactId, cur);
    }
    return NextResponse.json({ rows: Array.from(map.values()) });
  }

  // Sales reports
  if (
    [
      "detail-penjualan",
      "umur-piutang",
      "piutang-pelanggan",
      "tagihan-pelanggan",
      "pendapatan-pelanggan",
      "penjualan-produk",
      "pelunasan-penjualan",
    ].includes(type)
  ) {
    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, status: { not: "VOID" }, ...(dateFilter ? { transDate: dateFilter } : {}) },
      include: { contact: true, items: { include: { product: true } } },
      orderBy: { transDate: "desc" },
    });

    const now = new Date();
    const aging = invoices
      .filter((i) => Number(i.balanceDue) > 0)
      .map((i) => {
        const diffDays = Math.floor((now.getTime() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        const bal = Number(i.balanceDue);
        return {
          invoiceNo: i.invoiceNo,
          contactName: i.contact.name,
          dueDate: i.dueDate,
          balanceDue: bal,
          current: diffDays <= 0 ? bal : 0,
          d1_30: diffDays > 0 && diffDays <= 30 ? bal : 0,
          d31_60: diffDays > 30 && diffDays <= 60 ? bal : 0,
          d61_90: diffDays > 60 && diffDays <= 90 ? bal : 0,
          over90: diffDays > 90 ? bal : 0,
        };
      });

    return NextResponse.json({
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNo: i.invoiceNo,
        contactName: i.contact.name,
        transDate: i.transDate,
        dueDate: i.dueDate,
        status: i.status,
        grandTotal: Number(i.grandTotal),
        paidAmount: Number(i.paidAmount),
        balanceDue: Number(i.balanceDue),
      })),
      aging,
    });
  }

  // Purchase reports
  if (
    [
      "detail-pembelian",
      "umur-hutang",
      "hutang-vendor",
      "tagihan-vendor",
      "pembelian-produk",
      "pembelian-vendor",
      "pelunasan-pembelian",
    ].includes(type)
  ) {
    const bills = await prisma.purchaseInvoice.findMany({
      where: { companyId, status: { not: "VOID" }, ...(dateFilter ? { transDate: dateFilter } : {}) },
      include: { contact: true },
      orderBy: { transDate: "desc" },
    });

    const now = new Date();
    const aging = bills
      .filter((b) => Number(b.balanceDue) > 0)
      .map((b) => {
        const diffDays = Math.floor((now.getTime() - new Date(b.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        const bal = Number(b.balanceDue);
        return {
          billNo: b.billNo,
          contactName: b.contact.name,
          dueDate: b.dueDate,
          balanceDue: bal,
          current: diffDays <= 0 ? bal : 0,
          d1_30: diffDays > 0 && diffDays <= 30 ? bal : 0,
          d31_60: diffDays > 30 && diffDays <= 60 ? bal : 0,
          d61_90: diffDays > 60 && diffDays <= 90 ? bal : 0,
          over90: diffDays > 90 ? bal : 0,
        };
      });

    return NextResponse.json({
      bills: bills.map((b) => ({
        id: b.id,
        billNo: b.billNo,
        contactName: b.contact.name,
        transDate: b.transDate,
        dueDate: b.dueDate,
        status: b.status,
        grandTotal: Number(b.grandTotal),
        paidAmount: Number(b.paidAmount),
        balanceDue: Number(b.balanceDue),
      })),
      aging,
    });
  }

  return NextResponse.json({ empty: true });
}
