import { prisma } from "@/lib/prisma";

export interface JournalLineInput {
  accountId: string;
  contactId?: string | null;
  debit: number;
  credit: number;
  description?: string | null;
}

export function formatIDR(value: number | string) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

export async function getNextDocNumber(companyId: string, docType: string): Promise<string> {
  const seq = await prisma.numberSequence.upsert({
    where: { companyId_docType: { companyId, docType } },
    update: { nextNumber: { increment: 1 } },
    create: { companyId, docType, prefix: `${docType}-`, nextNumber: 2, padding: 4 },
  });
  // Because update incremented nextNumber, the assigned number is nextNumber - 1
  const assigned = seq.nextNumber - 1;
  return `${seq.prefix}${String(assigned).padStart(seq.padding, "0")}`;
}

export async function createBalancedJournal(params: {
  companyId: string;
  transDate: Date;
  memo: string;
  sourceType?: string;
  sourceId?: string;
  entryNo?: string;
  lines: JournalLineInput[];
}) {
  const { companyId, transDate, memo, sourceType = "MANUAL", sourceId, lines } = params;

  if (!lines || lines.length < 2) {
    throw new Error("Jurnal minimal harus memiliki 2 baris (Debit & Kredit).");
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (const l of lines) {
    const d = Number(l.debit) || 0;
    const c = Number(l.credit) || 0;
    if (d < 0 || c < 0) throw new Error("Nilai debit/kredit tidak boleh negatif.");
    if (d === 0 && c === 0) throw new Error("Setiap baris jurnal harus memiliki nilai debit atau kredit.");
    totalDebit += d;
    totalCredit += c;
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Jurnal tidak seimbang: Total Debit (${formatIDR(totalDebit)}) ≠ Total Kredit (${formatIDR(totalCredit)}).`
    );
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (company?.lockDate && transDate <= company.lockDate) {
    throw new Error("Tanggal transaksi berada pada periode yang sudah dikunci (Lock Date).");
  }

  const entryNo = params.entryNo || (await getNextDocNumber(companyId, "JRN"));

  return prisma.journalEntry.create({
    data: {
      companyId,
      entryNo,
      transDate,
      memo,
      sourceType,
      sourceId,
      status: "POSTED",
      lines: {
        create: lines.map((l) => ({
          accountId: l.accountId,
          contactId: l.contactId || null,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || null,
        })),
      },
    },
    include: {
      lines: { include: { account: true, contact: true } },
    },
  });
}

export async function getTrialBalance(companyId: string, startDate?: Date, endDate?: Date) {
  const accounts = await prisma.account.findMany({
    where: { companyId },
    orderBy: { code: "asc" },
  });

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        companyId,
        status: "POSTED",
        ...(startDate || endDate ? { transDate: dateFilter } : {}),
      },
    },
    select: {
      accountId: true,
      debit: true,
      credit: true,
    },
  });

  const totals = new Map<string, { debit: number; credit: number }>();
  for (const line of lines) {
    const cur = totals.get(line.accountId) ?? { debit: 0, credit: 0 };
    cur.debit += Number(line.debit);
    cur.credit += Number(line.credit);
    totals.set(line.accountId, cur);
  }

  const rows = accounts.map((acc) => {
    const t = totals.get(acc.id) ?? { debit: 0, credit: 0 };
    const net =
      acc.normalBalance === "DEBIT" ? t.debit - t.credit : t.credit - t.debit;
    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      category: acc.category,
      normalBalance: acc.normalBalance,
      isCashBank: acc.isCashBank,
      debitTotal: t.debit,
      creditTotal: t.credit,
      endingBalance: net,
      trialDebit: acc.normalBalance === "DEBIT" ? Math.max(net, 0) : Math.max(-net, 0),
      trialCredit: acc.normalBalance === "CREDIT" ? Math.max(net, 0) : Math.max(-net, 0),
    };
  });

  const sumTrialDebit = rows.reduce((s, r) => s + r.trialDebit, 0);
  const sumTrialCredit = rows.reduce((s, r) => s + r.trialCredit, 0);

  return { rows, sumTrialDebit, sumTrialCredit };
}
