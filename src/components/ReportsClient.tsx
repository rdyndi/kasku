"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Search, Star } from "lucide-react";
import { ProfitLossView, type PLData } from "@/components/ProfitLossView";

interface TrialRow {
  id: string;
  code: string;
  name: string;
  category: string;
  debitTotal: number;
  creditTotal: number;
  trialDebit: number;
  trialCredit: number;
}

interface LedgerGroup {
  account: { id: string; code: string; name: string; normalBalance: string };
  endingBalance: number;
  movements: Array<{
    id: string;
    entryNo: string;
    transDate: string;
    memo: string;
    description: string | null;
    contactName: string | null;
    debit: number;
    credit: number;
    balance: number;
  }>;
}

interface ReportDef {
  id: string;
  label: string;
  defaultFav?: boolean;
}

const REPORT_GROUPS: Array<{ title: string; items: ReportDef[] }> = [
  {
    title: "Finansial",
    items: [
      { id: "neraca", label: "Neraca", defaultFav: true },
      { id: "arus-kas", label: "Arus Kas" },
      { id: "proyeksi-arus-kas", label: "Proyeksi Arus Kas" },
      { id: "laba-rugi", label: "Laba Rugi", defaultFav: true },
      { id: "perubahan-modal", label: "Perubahan Modal" },
      { id: "ringkasan-eksekutif", label: "Ringkasan Eksekutif" },
      { id: "hutang-piutang-kontak", label: "Hutang Piutang per Kontak" },
    ],
  },
  {
    title: "Akuntansi",
    items: [
      { id: "ringkasan-bank", label: "Ringkasan Bank" },
      { id: "buku-besar", label: "Buku Besar" },
      { id: "buku-besar-pembantu", label: "Buku Besar Pembantu" },
      { id: "jurnal", label: "Jurnal" },
      { id: "trial-balance", label: "Trial Balance" },
    ],
  },
  {
    title: "Penjualan",
    items: [
      { id: "detail-penjualan", label: "Detail Penjualan" },
      { id: "umur-piutang", label: "Umur Piutang" },
      { id: "piutang-pelanggan", label: "Laporan Piutang Pelanggan" },
      { id: "saldo-piutang-termin", label: "Saldo Piutang Termin" },
      { id: "credit-memo", label: "Credit Memo" },
      { id: "tagihan-pelanggan", label: "Tagihan Pelanggan" },
      { id: "profitabilitas-produk", label: "Profitabilitas Produk" },
      { id: "profitabilitas-tagihan", label: "Profitabilitas per Tagihan" },
      { id: "pendapatan-pelanggan", label: "Pendapatan per Pelanggan" },
      { id: "penjualan-produk", label: "Penjualan per Produk" },
      { id: "pemesanan-produk", label: "Pemesanan per Produk" },
      { id: "penjualan-sales", label: "Penjualan per Sales Person" },
      { id: "pengiriman-penjualan", label: "Pengiriman Penjualan" },
      { id: "ongkos-kirim", label: "Ongkos Kirim per Ekspedisi" },
      { id: "pelunasan-penjualan", label: "Pelunasan Pembayaran Tagihan" },
    ],
  },
  {
    title: "Pembelian",
    items: [
      { id: "detail-pembelian", label: "Detail Pembelian" },
      { id: "umur-hutang", label: "Umur Hutang" },
      { id: "hutang-vendor", label: "Laporan Hutang Vendor" },
      { id: "saldo-hutang-termin", label: "Saldo Hutang Termin" },
      { id: "debit-memo", label: "Debit Memo" },
      { id: "tagihan-vendor", label: "Tagihan Vendor" },
      { id: "pembelian-produk", label: "Pembelian per Produk" },
      { id: "retur-pembelian", label: "Retur Pembelian Per Produk" },
      { id: "pembelian-vendor", label: "Pembelian per Vendor" },
      { id: "pengiriman-pembelian", label: "Pengiriman Pembelian" },
      { id: "pelunasan-pembelian", label: "Pelunasan Pembayaran Tagihan Pembelian" },
      { id: "pembelian-produk-vendor", label: "Pembelian Produk per Vendor" },
      { id: "pembelian-periode", label: "Pembelian per Periode" },
      { id: "pembelian-region", label: "Pembelian per Region" },
    ],
  },
];

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function ReportsClient({
  trialRows,
  sumTrialDebit,
  sumTrialCredit,
  ledgers,
}: {
  trialRows: TrialRow[];
  sumTrialDebit: number;
  sumTrialCredit: number;
  ledgers: LedgerGroup[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(["neraca", "laba-rugi"]);
  const [activeReport, setActiveReport] = useState<ReportDef | null>(null);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("all");

  // Reports with standalone pages
  const STANDALONE_ROUTES: Record<string, string> = {
    "pembelian-vendor": "/laporan/pembelian-per-vendor",
    "pembelian-produk": "/laporan/pembelian-per-item",
    "penjualan-produk": "/laporan/penjualan-per-item",
    "pendapatan-pelanggan": "/laporan/penjualan-per-pelanggan",
  };

  function toggleFav(id: string) {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function openReport(
    rep: ReportDef,
    sDate = startDate,
    eDate = endDate,
    extra?: { year?: number; compare?: boolean }
  ) {
    // Navigate to standalone page if available
    if (STANDALONE_ROUTES[rep.id]) {
      router.push(STANDALONE_ROUTES[rep.id]);
      return;
    }

    setActiveReport(rep);
    if (["trial-balance", "buku-besar", "buku-besar-pembantu", "jurnal"].includes(rep.id)) {
      setReportData({ local: true });
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams({ type: rep.id });
      if (sDate) qs.set("startDate", sDate);
      if (eDate) qs.set("endDate", eDate);
      if (extra?.year) qs.set("year", String(extra.year));
      if (extra?.compare === false) qs.set("compare", "none");
      const res = await fetch(`/api/reports/financial?${qs.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setReportData(d);
      }
    } finally {
      setLoading(false);
    }
  }

  // Detail Report View
  if (activeReport) {
    const visibleLedgers =
      selectedAccountId === "all"
        ? ledgers.filter((l) => l.movements.length > 0)
        : ledgers.filter((l) => l.account.id === selectedAccountId);

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveReport(null);
                setReportData(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Semua Laporan
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{activeReport.label}</h1>
              <p className="text-xs text-slate-500">Data akuntansi real-time KASKU</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            />
            <button
              onClick={() => openReport(activeReport, startDate, endDate)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
            >
              Terapkan
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Memuat laporan...
          </div>
        )}

        {!loading && activeReport.id === "laba-rugi" && reportData && (
          <ProfitLossView
            data={reportData as unknown as PLData}
            onReload={(opts) => openReport(activeReport, "", "", opts)}
          />
        )}

        {!loading && activeReport.id === "neraca" && reportData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <ReportSection title="ASET" rows={(reportData.assets as TrialRow[]) || []} total={Number(reportData.totalAssets)} />
              <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-lg font-bold text-blue-900">
                <span>TOTAL ASET</span>
                <span>{formatIDR(Number(reportData.totalAssets))}</span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <ReportSection title="LIABILITAS / UTANG" rows={(reportData.liabilities as TrialRow[]) || []} total={Number(reportData.totalLiabilities)} />
              <ReportSection
                title="EKUITAS / MODAL"
                rows={[
                  ...((reportData.equities as TrialRow[]) || []),
                  {
                    id: "current-profit",
                    code: "3-99999",
                    name: "Laba / Rugi Tahun Berjalan",
                    category: "equity",
                    debitTotal: 0,
                    creditTotal: 0,
                    trialDebit: 0,
                    trialCredit: 0,
                    endingBalance: Number(reportData.currentYearProfit),
                  } as TrialRow & { endingBalance: number },
                ]}
                total={Number(reportData.totalEquity)}
              />
              <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-lg font-bold text-blue-900">
                <span>TOTAL LIABILITAS & EKUITAS</span>
                <span>{formatIDR(Number(reportData.totalLiabilitiesAndEquity))}</span>
              </div>
            </div>
          </div>
        )}

        {!loading && (activeReport.id === "arus-kas" || activeReport.id === "proyeksi-arus-kas") && reportData && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500">Kas Masuk Operasi</div>
                <div className="text-lg font-bold text-emerald-600">{formatIDR(Number(reportData.operatingIn))}</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500">Kas Keluar Operasi</div>
                <div className="text-lg font-bold text-red-600">{formatIDR(Number(reportData.operatingOut))}</div>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-xs text-blue-700">Perubahan Kas Bersih</div>
                <div className="text-lg font-bold text-blue-900">{formatIDR(Number(reportData.netCashChange))}</div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Tanggal</th>
                  <th className="px-4 py-2">No. Jurnal</th>
                  <th className="px-4 py-2">Akun Kas/Bank</th>
                  <th className="px-4 py-2">Memo</th>
                  <th className="px-4 py-2 text-right">Arus Kas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {((reportData.movements as Array<{ id: string; date: string; entryNo: string; accountName: string; memo: string; amount: number }>) || []).map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2 text-slate-600">{new Date(m.date).toLocaleDateString("id-ID")}</td>
                    <td className="px-4 py-2 font-mono text-xs text-blue-700">{m.entryNo}</td>
                    <td className="px-4 py-2 text-slate-800">{m.accountName}</td>
                    <td className="px-4 py-2 text-slate-600">{m.memo}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${m.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatIDR(m.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeReport.id === "perubahan-modal" && reportData && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-xl space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100"><span>Modal Disetor & Saldo Awal</span><strong>{formatIDR(Number(reportData.modalDisetor))}</strong></div>
            <div className="flex justify-between py-2 border-b border-slate-100"><span>Laba / Rugi Bersih Periode Berjalan</span><strong className="text-emerald-600">{formatIDR(Number(reportData.netProfit))}</strong></div>
            <div className="flex justify-between py-2 border-b border-slate-100"><span>Prive / Pengambilan Pemilik</span><strong className="text-red-600">-{formatIDR(Number(reportData.prive))}</strong></div>
            <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-lg font-bold text-base text-blue-900"><span>MODAL AKHIR</span><span>{formatIDR(Number(reportData.endingEquity))}</span></div>
          </div>
        )}

        {!loading && (activeReport.id === "ringkasan-eksekutif" || activeReport.id === "ringkasan-bank") && reportData && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200"><div className="text-xs text-slate-500">Total Kas & Bank</div><div className="mt-1 text-xl font-bold text-blue-600">{formatIDR(Number(reportData.totalCash))}</div></div>
              <div className="bg-white p-5 rounded-xl border border-slate-200"><div className="text-xs text-slate-500">Piutang Usaha</div><div className="mt-1 text-xl font-bold text-slate-900">{formatIDR(Number(reportData.totalAR))}</div></div>
              <div className="bg-white p-5 rounded-xl border border-slate-200"><div className="text-xs text-slate-500">Utang Usaha</div><div className="mt-1 text-xl font-bold text-red-600">{formatIDR(Number(reportData.totalAP))}</div></div>
              <div className="bg-white p-5 rounded-xl border border-slate-200"><div className="text-xs text-slate-500">Laba Bersih</div><div className="mt-1 text-xl font-bold text-emerald-600">{formatIDR(Number(reportData.netProfit))}</div></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Rincian Saldo Kas & Bank</h3>
              <div className="divide-y divide-slate-100 text-sm">
                {((reportData.cashAccounts as Array<{ id: string; code: string; name: string; endingBalance: number }>) || []).map((c) => (
                  <div key={c.id} className="py-2.5 flex justify-between">
                    <span><span className="font-mono text-xs text-slate-400 mr-2">{c.code}</span>{c.name}</span>
                    <strong className="text-slate-900">{formatIDR(c.endingBalance)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && activeReport.id === "hutang-piutang-kontak" && reportData && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                <tr><th className="px-4 py-3">Kontak</th><th className="px-4 py-3 text-right">Piutang (Tagihan)</th><th className="px-4 py-3 text-right">Utang (Supplier)</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {((reportData.rows as Array<{ name: string; piutang: number; hutang: number }>) || []).map((r, i) => (
                  <tr key={i}><td className="px-4 py-3 font-medium">{r.name}</td><td className="px-4 py-3 text-right text-blue-700">{formatIDR(r.piutang)}</td><td className="px-4 py-3 text-right text-red-600">{formatIDR(r.hutang)}</td></tr>
                ))}
                {((reportData.rows as unknown[]) || []).length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Tidak ada saldo hutang/piutang terbuka.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeReport.id === "trial-balance" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
                <tr><th className="px-4 py-3">Kode</th><th className="px-4 py-3">Nama Akun</th><th className="px-4 py-3 text-right">Mutasi Debit</th><th className="px-4 py-3 text-right">Mutasi Kredit</th><th className="px-4 py-3 text-right">Saldo Debit</th><th className="px-4 py-3 text-right">Saldo Kredit</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trialRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.code}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{r.name}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formatIDR(r.debitTotal)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formatIDR(r.creditTotal)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{r.trialDebit > 0 ? formatIDR(r.trialDebit) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{r.trialCredit > 0 ? formatIDR(r.trialCredit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr><td colSpan={4} className="px-4 py-3 text-right">TOTAL NERACA SALDO</td><td className="px-4 py-3 text-right text-blue-700">{formatIDR(sumTrialDebit)}</td><td className="px-4 py-3 text-right text-blue-700">{formatIDR(sumTrialCredit)}</td></tr>
              </tfoot>
            </table>
          </div>
        )}

        {!loading && (activeReport.id === "buku-besar" || activeReport.id === "buku-besar-pembantu" || activeReport.id === "jurnal") && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Filter Akun:</label>
              <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="all">Semua Akun Bermutasi</option>
                {ledgers.map((l) => <option key={l.account.id} value={l.account.id}>{l.account.code} — {l.account.name}</option>)}
              </select>
            </div>
            {visibleLedgers.map((group) => (
              <div key={group.account.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div><span className="font-mono text-xs text-slate-500 mr-2">{group.account.code}</span><span className="font-semibold text-slate-900">{group.account.name}</span></div>
                  <div className="text-sm font-bold text-blue-700">Saldo Akhir: {formatIDR(group.endingBalance)}</div>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-400"><th className="px-5 py-2">Tanggal</th><th className="px-5 py-2">No. Jurnal</th><th className="px-5 py-2">Memo</th><th className="px-5 py-2 text-right">Debit</th><th className="px-5 py-2 text-right">Kredit</th><th className="px-5 py-2 text-right">Saldo</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {group.movements.map((m) => (
                      <tr key={m.id}>
                        <td className="px-5 py-2 text-slate-600">{new Date(m.transDate).toLocaleDateString("id-ID")}</td>
                        <td className="px-5 py-2 font-mono text-xs text-blue-700">{m.entryNo}</td>
                        <td className="px-5 py-2 text-slate-800">{m.memo}</td>
                        <td className="px-5 py-2 text-right">{m.debit > 0 ? formatIDR(m.debit) : "—"}</td>
                        <td className="px-5 py-2 text-right">{m.credit > 0 ? formatIDR(m.credit) : "—"}</td>
                        <td className="px-5 py-2 text-right font-semibold">{formatIDR(m.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {!loading && Boolean(reportData?.invoices) && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
            {activeReport.id === "umur-piutang" ? (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                  <tr><th className="px-4 py-3">No. Invoice</th><th className="px-4 py-3">Pelanggan</th><th className="px-4 py-3 text-right">Belum Jatuh Tempo</th><th className="px-4 py-3 text-right">1–30 Hari</th><th className="px-4 py-3 text-right">31–60 Hari</th><th className="px-4 py-3 text-right">&gt;60 Hari</th><th className="px-4 py-3 text-right">Total Sisa</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((reportData?.aging as Array<{ invoiceNo: string; contactName: string; current: number; d1_30: number; d31_60: number; d61_90: number; over90: number; balanceDue: number }>) || []).map((a, i) => (
                    <tr key={i}><td className="px-4 py-3 font-mono text-xs text-blue-700">{a.invoiceNo}</td><td className="px-4 py-3">{a.contactName}</td><td className="px-4 py-3 text-right">{formatIDR(a.current)}</td><td className="px-4 py-3 text-right">{formatIDR(a.d1_30)}</td><td className="px-4 py-3 text-right">{formatIDR(a.d31_60)}</td><td className="px-4 py-3 text-right">{formatIDR(a.d61_90 + a.over90)}</td><td className="px-4 py-3 text-right font-bold">{formatIDR(a.balanceDue)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                  <tr><th className="px-4 py-3">No. Invoice</th><th className="px-4 py-3">Pelanggan</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Sisa</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((reportData?.invoices as Array<{ id: string; invoiceNo: string; contactName: string; transDate: string; status: string; grandTotal: number; balanceDue: number }>) || []).map((inv) => (
                    <tr key={inv.id}><td className="px-4 py-3 font-mono text-xs text-blue-700">{inv.invoiceNo}</td><td className="px-4 py-3">{inv.contactName}</td><td className="px-4 py-3">{new Date(inv.transDate).toLocaleDateString("id-ID")}</td><td className="px-4 py-3">{inv.status}</td><td className="px-4 py-3 text-right">{formatIDR(inv.grandTotal)}</td><td className="px-4 py-3 text-right font-semibold">{formatIDR(inv.balanceDue)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!loading && Boolean(reportData?.bills) && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
            {activeReport.id === "umur-hutang" ? (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                  <tr><th className="px-4 py-3">No. Bill</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3 text-right">Belum Jatuh Tempo</th><th className="px-4 py-3 text-right">1–30 Hari</th><th className="px-4 py-3 text-right">31–60 Hari</th><th className="px-4 py-3 text-right">&gt;60 Hari</th><th className="px-4 py-3 text-right">Total Sisa</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((reportData?.aging as Array<{ billNo: string; contactName: string; current: number; d1_30: number; d31_60: number; d61_90: number; over90: number; balanceDue: number }>) || []).map((a, i) => (
                    <tr key={i}><td className="px-4 py-3 font-mono text-xs text-blue-700">{a.billNo}</td><td className="px-4 py-3">{a.contactName}</td><td className="px-4 py-3 text-right">{formatIDR(a.current)}</td><td className="px-4 py-3 text-right">{formatIDR(a.d1_30)}</td><td className="px-4 py-3 text-right">{formatIDR(a.d31_60)}</td><td className="px-4 py-3 text-right">{formatIDR(a.d61_90 + a.over90)}</td><td className="px-4 py-3 text-right font-bold">{formatIDR(a.balanceDue)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                  <tr><th className="px-4 py-3">No. Bill</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Sisa</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {((reportData?.bills as Array<{ id: string; billNo: string; contactName: string; transDate: string; status: string; grandTotal: number; balanceDue: number }>) || []).map((b) => (
                    <tr key={b.id}><td className="px-4 py-3 font-mono text-xs text-blue-700">{b.billNo}</td><td className="px-4 py-3">{b.contactName}</td><td className="px-4 py-3">{new Date(b.transDate).toLocaleDateString("id-ID")}</td><td className="px-4 py-3">{b.status}</td><td className="px-4 py-3 text-right">{formatIDR(b.grandTotal)}</td><td className="px-4 py-3 text-right font-semibold">{formatIDR(b.balanceDue)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!loading && Boolean(reportData?.empty) && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Belum ada data transaksi untuk laporan <strong>{activeReport.label}</strong> pada periode ini.
          </div>
        )}
      </div>
    );
  }

  // Kledo-style 2-column Reports Directory
  const q = search.trim().toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Laporan</h1>
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari laporan..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {REPORT_GROUPS.map((group) => {
          const items = group.items.filter((it) => !q || it.label.toLowerCase().includes(q));
          if (items.length === 0) return null;
          return (
            <div key={group.title} className="space-y-2.5">
              <h2 className="text-sm font-bold text-slate-900">{group.title}</h2>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                {items.map((rep) => {
                  const isFav = favorites.includes(rep.id);
                  return (
                    <div
                      key={rep.id}
                      onClick={() => openReport(rep)}
                      className="px-5 py-3.5 flex items-center gap-3.5 cursor-pointer transition hover:bg-blue-50/40 group"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFav(rep.id);
                        }}
                        className="text-blue-500 hover:scale-110 transition shrink-0"
                        aria-label={`Favorit ${rep.label}`}
                      >
                        <Star className={`w-4 h-4 ${isFav ? "fill-blue-600 text-blue-600" : "text-blue-400"}`} />
                      </button>
                      <span className="text-sm font-medium text-blue-600 group-hover:underline">
                        {rep.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportSection({
  title,
  rows,
  total,
}: {
  title: string;
  rows: Array<{ id: string; code: string; name: string; endingBalance?: number }>;
  total: number;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      <div className="divide-y divide-slate-100 text-sm">
        {rows.map((r) => (
          <div key={r.id} className="py-2 flex justify-between">
            <span className="text-slate-800">
              <span className="font-mono text-xs text-slate-400 mr-2">{r.code}</span>
              {r.name}
            </span>
            <span className="font-medium text-slate-900">{formatIDR(r.endingBalance ?? 0)}</span>
          </div>
        ))}
        {rows.length === 0 && <div className="py-2 text-xs text-slate-400">Tidak ada saldo</div>}
      </div>
      <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-semibold text-slate-800">
        <span>Total {title}</span>
        <span>{formatIDR(total)}</span>
      </div>
    </div>
  );
}
