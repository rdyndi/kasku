import { prisma } from "@/lib/prisma";

export const DEFAULT_COA = [
  { code: "1-10001", name: "Kas Tunai", category: "asset", subCategory: "kas_bank", normalBalance: "DEBIT", isCashBank: true, isSystem: true, mappingKey: "default_cash" },
  { code: "1-10002", name: "Bank BCA", category: "asset", subCategory: "kas_bank", normalBalance: "DEBIT", isCashBank: true, isSystem: false },
  { code: "1-10100", name: "Piutang Usaha", category: "asset", subCategory: "piutang", normalBalance: "DEBIT", isCashBank: false, isSystem: true, mappingKey: "default_ar" },
  { code: "1-10200", name: "Persediaan Barang Dagang", category: "asset", subCategory: "persediaan", normalBalance: "DEBIT", isCashBank: false, isSystem: true, mappingKey: "default_inventory" },
  { code: "1-10300", name: "PPN Masukan", category: "asset", subCategory: "aset_lancar", normalBalance: "DEBIT", isCashBank: false, isSystem: true, mappingKey: "default_tax_in" },
  { code: "1-20001", name: "Peralatan & Perlengkapan", category: "asset", subCategory: "aset_tetap", normalBalance: "DEBIT", isCashBank: false, isSystem: false },
  { code: "1-20002", name: "Akumulasi Penyusutan Peralatan", category: "asset", subCategory: "aset_tetap", normalBalance: "CREDIT", isCashBank: false, isSystem: false },

  { code: "2-20100", name: "Utang Usaha", category: "liability", subCategory: "utang_usaha", normalBalance: "CREDIT", isCashBank: false, isSystem: true, mappingKey: "default_ap" },
  { code: "2-20200", name: "PPN Keluaran", category: "liability", subCategory: "kewajiban_lancar", normalBalance: "CREDIT", isCashBank: false, isSystem: true, mappingKey: "default_tax_out" },
  { code: "2-20300", name: "Utang Biaya", category: "liability", subCategory: "kewajiban_lancar", normalBalance: "CREDIT", isCashBank: false, isSystem: false },

  { code: "3-30001", name: "Modal Disetor", category: "equity", subCategory: "ekuitas", normalBalance: "CREDIT", isCashBank: false, isSystem: true },
  { code: "3-30002", name: "Saldo Awal Ekuitas", category: "equity", subCategory: "ekuitas", normalBalance: "CREDIT", isCashBank: false, isSystem: true, mappingKey: "default_opening_equity" },
  { code: "3-30003", name: "Laba Ditahan", category: "equity", subCategory: "ekuitas", normalBalance: "CREDIT", isCashBank: false, isSystem: true },
  { code: "3-30004", name: "Prive Pemilik", category: "equity", subCategory: "ekuitas", normalBalance: "DEBIT", isCashBank: false, isSystem: false },

  { code: "4-40001", name: "Pendapatan Penjualan", category: "revenue", subCategory: "pendapatan", normalBalance: "CREDIT", isCashBank: false, isSystem: true, mappingKey: "default_sales" },
  { code: "4-40002", name: "Pendapatan Jasa", category: "revenue", subCategory: "pendapatan", normalBalance: "CREDIT", isCashBank: false, isSystem: false },

  { code: "5-50001", name: "Harga Pokok Penjualan (HPP)", category: "cogs", subCategory: "hpp", normalBalance: "DEBIT", isCashBank: false, isSystem: true, mappingKey: "default_cogs" },

  { code: "6-60001", name: "Beban Gaji & Upah", category: "expense", subCategory: "beban_operasional", normalBalance: "DEBIT", isCashBank: false, isSystem: false },
  { code: "6-60002", name: "Beban Sewa Tempat", category: "expense", subCategory: "beban_operasional", normalBalance: "DEBIT", isCashBank: false, isSystem: false },
  { code: "6-60003", name: "Beban Listrik, Air & Internet", category: "expense", subCategory: "beban_operasional", normalBalance: "DEBIT", isCashBank: false, isSystem: false },
  { code: "6-60004", name: "Beban Penyusutan", category: "expense", subCategory: "beban_operasional", normalBalance: "DEBIT", isCashBank: false, isSystem: false },
  { code: "6-60005", name: "Beban Perlengkapan Kantor", category: "expense", subCategory: "beban_operasional", normalBalance: "DEBIT", isCashBank: false, isSystem: false },
];

export async function provisionCompanyDefaults(companyId: string, includeDemo = true) {
  // 1. Roles
  const ownerRole = await prisma.role.upsert({
    where: { companyId_name: { companyId, name: "Owner" } },
    update: {},
    create: {
      companyId,
      name: "Owner",
      permissions: JSON.stringify({ all: true }),
    },
  });

  await prisma.role.upsert({
    where: { companyId_name: { companyId, name: "Admin Keuangan" } },
    update: {},
    create: {
      companyId,
      name: "Admin Keuangan",
      permissions: JSON.stringify({ accounting: true, sales: true, purchase: true, reports: true }),
    },
  });

  // 2. Number Sequences
  const sequences = [
    { docType: "JRN", prefix: "JRN-", nextNumber: 1, padding: 4 },
    { docType: "INV", prefix: "INV-", nextNumber: 1, padding: 4 },
    { docType: "QUO", prefix: "QUO-", nextNumber: 1, padding: 4 },
    { docType: "PO", prefix: "PO-", nextNumber: 1, padding: 4 },
    { docType: "BILL", prefix: "BILL-", nextNumber: 1, padding: 4 },
    { docType: "EXP", prefix: "EXP-", nextNumber: 1, padding: 4 },
    { docType: "PAY", prefix: "PAY-", nextNumber: 1, padding: 4 },
    { docType: "TRF", prefix: "TRF-", nextNumber: 1, padding: 4 },
    { docType: "AST", prefix: "AST-", nextNumber: 1, padding: 4 },
  ];

  for (const seq of sequences) {
    await prisma.numberSequence.upsert({
      where: { companyId_docType: { companyId, docType: seq.docType } },
      update: {},
      create: { companyId, ...seq },
    });
  }

  // 3. Payment Terms & Taxes & Default Warehouse
  const terms = [
    { name: "Tunai (COD)", days: 0 },
    { name: "Net 7", days: 7 },
    { name: "Net 15", days: 15 },
    { name: "Net 30", days: 30 },
  ];
  for (const t of terms) {
    await prisma.paymentTerm.upsert({
      where: { companyId_name: { companyId, name: t.name } },
      update: {},
      create: { companyId, ...t },
    });
  }

  const taxes = [
    { name: "PPN 11%", rate: 11, type: "addition" },
    { name: "PPh 23 (2%)", rate: 2, type: "withholding" },
    { name: "Bebas Pajak (0%)", rate: 0, type: "addition" },
  ];
  for (const tx of taxes) {
    await prisma.tax.upsert({
      where: { companyId_name: { companyId, name: tx.name } },
      update: {},
      create: { companyId, ...tx },
    });
  }

  await prisma.warehouse.upsert({
    where: { companyId_code: { companyId, code: "GUD-01" } },
    update: {},
    create: { companyId, code: "GUD-01", name: "Gudang Utama", isDefault: true },
  });

  // 4. Chart of Accounts + Account Mappings
  const accountByCode = new Map<string, string>();
  for (const coa of DEFAULT_COA) {
    const acc = await prisma.account.upsert({
      where: { companyId_code: { companyId, code: coa.code } },
      update: {},
      create: {
        companyId,
        code: coa.code,
        name: coa.name,
        category: coa.category,
        subCategory: coa.subCategory,
        normalBalance: coa.normalBalance,
        isCashBank: coa.isCashBank,
        isSystem: coa.isSystem,
      },
    });
    accountByCode.set(coa.code, acc.id);

    if (coa.mappingKey) {
      await prisma.accountMapping.upsert({
        where: { companyId_mappingKey: { companyId, mappingKey: coa.mappingKey } },
        update: { accountId: acc.id },
        create: { companyId, mappingKey: coa.mappingKey, accountId: acc.id },
      });
    }
  }

  // 5. Demo Data (Kontak & Jurnal Awal)
  if (includeDemo) {
    const existingContacts = await prisma.contact.count({ where: { companyId } });
    if (existingContacts === 0) {
      await prisma.contact.createMany({
        data: [
          {
            companyId,
            type: "customer",
            name: "PT Maju Bersama",
            companyName: "PT Maju Bersama",
            email: "finance@majubersama.co.id",
            phone: "0812-3456-7890",
            address: "Jl. Sudirman Kav. 10, Jakarta Selatan",
            isDemoData: true,
          },
          {
            companyId,
            type: "customer",
            name: "Toko Berkah Jaya",
            companyName: "Toko Berkah Jaya",
            email: "order@berkahjaya.id",
            phone: "0813-9988-7766",
            address: "Jl. Ahmad Yani No. 45, Bandung",
            isDemoData: true,
          },
          {
            companyId,
            type: "vendor",
            name: "CV Sumber Makmur",
            companyName: "CV Sumber Makmur",
            email: "ap@sumbermakmur.com",
            phone: "0811-2233-4455",
            address: "Kawasan Industri Jababeka, Bekasi",
            isDemoData: true,
          },
          {
            companyId,
            type: "employee",
            name: "Budi Santoso",
            companyName: "Internal",
            email: "budi@umkm-demo.id",
            phone: "0856-7788-9900",
            address: "Jakarta Timur",
            isDemoData: true,
          },
        ],
      });
    }

    const existingJournals = await prisma.journalEntry.count({ where: { companyId } });
    if (existingJournals === 0) {
      const kasId = accountByCode.get("1-10001")!;
      const bankId = accountByCode.get("1-10002")!;
      const modalId = accountByCode.get("3-30001")!;
      const salesId = accountByCode.get("4-40001")!;
      const sewaId = accountByCode.get("6-60002")!;

      const today = new Date();
      await prisma.journalEntry.create({
        data: {
          companyId,
          entryNo: "JRN-0001",
          transDate: new Date(today.getFullYear(), today.getMonth(), 1),
          memo: "[Demo] Setoran Modal Awal Usaha",
          sourceType: "OPENING_BALANCE",
          status: "POSTED",
          isDemoData: true,
          lines: {
            create: [
              { accountId: kasId, debit: 15000000, credit: 0, description: "Saldo awal kas tunai" },
              { accountId: bankId, debit: 50000000, credit: 0, description: "Saldo awal Bank BCA" },
              { accountId: modalId, debit: 0, credit: 65000000, description: "Modal disetor pemilik" },
            ],
          },
        },
      });

      await prisma.journalEntry.create({
        data: {
          companyId,
          entryNo: "JRN-0002",
          transDate: new Date(today.getFullYear(), today.getMonth(), 3),
          memo: "[Demo] Penjualan Tunai & Pembayaran Sewa Toko",
          sourceType: "MANUAL",
          status: "POSTED",
          isDemoData: true,
          lines: {
            create: [
              { accountId: bankId, debit: 12500000, credit: 0, description: "Penerimaan penjualan tunai" },
              { accountId: salesId, debit: 0, credit: 12500000, description: "Pendapatan penjualan" },
            ],
          },
        },
      });

      await prisma.journalEntry.create({
        data: {
          companyId,
          entryNo: "JRN-0003",
          transDate: new Date(today.getFullYear(), today.getMonth(), 5),
          memo: "[Demo] Pembayaran Sewa Ruko Bulanan",
          sourceType: "MANUAL",
          status: "POSTED",
          isDemoData: true,
          lines: {
            create: [
              { accountId: sewaId, debit: 3500000, credit: 0, description: "Sewa ruko bulan berjalan" },
              { accountId: bankId, debit: 0, credit: 3500000, description: "Transfer Bank BCA" },
            ],
          },
        },
      });

      await prisma.numberSequence.update({
        where: { companyId_docType: { companyId, docType: "JRN" } },
        data: { nextNumber: 4 },
      });
    }
  }

  return ownerRole;
}
