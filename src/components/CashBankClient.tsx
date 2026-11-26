"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  BarChart3,
  Plus,
  Printer,
  Search,
  UserMinus,
  Wallet,
} from "lucide-react";
import { AreaChartSVG } from "@/components/DashboardCharts";
import { CurrencyInput } from "@/components/CurrencyInput";

type CashAccount = {
  id: string;
  code: string;
  name: string;
  balance: number;
  series: Array<{ label: string; value: number }>;
};
type AccountOpt = { id: string; code: string; name: string };
type Transfer = {
  id: string;
  docNo: string;
  type: string;
  transDate: string;
  amount: number;
  memo: string | null;
};

const fmt = (v: number) => Math.round(v || 0).toLocaleString("id-ID");
const money = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);

const TYPE_ICONS: Record<string, typeof ArrowDownLeft> = {
  RECEIVE: ArrowDownLeft,
  SEND: ArrowUpRight,
  TRANSFER: ArrowRightLeft,
  PRIVE: UserMinus,
};
const TYPE_LABELS: Record<string, string> = {
  RECEIVE: "Terima Dana",
  SEND: "Kirim Dana",
  TRANSFER: "Transfer",
  PRIVE: "Prive",
};
const TYPE_COLORS: Record<string, string> = {
  RECEIVE: "text-emerald-600",
  SEND: "text-red-600",
  TRANSFER: "text-blue-600",
  PRIVE: "text-orange-600",
};

const CHART_COLORS = ["#ff5a79", "#f7c348", "#42bfb9", "#2f80ed"];

export function CashBankClient({
  cashAccounts,
  allAccounts,
  transfers: init,
  initialDate,
}: {
  cashAccounts: CashAccount[];
  allAccounts: AccountOpt[];
  transfers: Transfer[];
  initialDate: string;
}) {
  const router = useRouter();
  const [transfers, setTransfers] = useState(init);
  const [search, setSearch] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [error, setError] = useState("");

  // Transfer form
  const [type, setType] = useState("TRANSFER");
  const [fromAccountId, setFromAccountId] = useState(cashAccounts[0]?.id || "");
  const [toAccountId, setToAccountId] = useState(cashAccounts[1]?.id || cashAccounts[0]?.id || "");
  const [transDate, setTransDate] = useState(initialDate);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  // Add Kas/Bank Account form
  const [accCode, setAccCode] = useState("");
  const [accName, setAccName] = useState("");

  async function refresh() {
    const res = await fetch("/api/cash-transfers");
    if (res.ok) {
      const d = await res.json();
      setTransfers(d.transfers.map((t: Record<string, unknown>) => ({ ...t, amount: Number(t.amount) })));
    }
    router.refresh();
  }

  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload =
      type === "RECEIVE"
        ? { type, fromAccountId: toAccountId, toAccountId: fromAccountId, transDate, amount: Number(amount), memo }
        : { type, fromAccountId, toAccountId, transDate, amount: Number(amount), memo };
    const res = await fetch("/api/cash-transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan transaksi.");
      return;
    }
    setShowTransferModal(false);
    setAmount("");
    setMemo("");
    await refresh();
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: accCode,
        name: accName,
        category: "asset",
        subCategory: "kas_bank",
        isCashBank: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menambah akun kas/bank.");
      return;
    }
    setAccCode("");
    setAccName("");
    setShowAddAccountModal(false);
    router.refresh();
  }

  async function handleDeleteTransfer(id: string) {
    if (!confirm("Hapus transaksi kas/bank ini?")) return;
    await fetch(`/api/cash-transfers/${id}`, { method: "DELETE" });
    await refresh();
  }

  function openTransferForAccount(accountId: string) {
    setFromAccountId(accountId);
    setError("");
    setShowTransferModal(true);
  }

  const q = search.trim().toLowerCase();
  const filteredAccounts = cashAccounts.filter(
    (a) => !q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-5">
      {/* Header Toolbar (Gaya Kledo) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Kas &amp; Bank</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/laporan"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Laporan
          </Link>
          <button
            onClick={() => {
              setError("");
              setShowTransferModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transfer / Terima / Kirim
          </button>
          <button
            onClick={() => {
              setError("");
              setShowAddAccountModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Kas &amp; Bank
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex justify-end">
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari akun kas/bank..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stacked Per-Account Cards with Area Charts (Gaya Kledo) */}
      <div className="space-y-5">
        {filteredAccounts.map((acc, idx) => (
          <div key={acc.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  href={`/kas-bank/${acc.id}`}
                  className="text-base font-bold text-blue-600 hover:underline"
                >
                  {acc.name}
                </Link>
                <div className="text-xs font-mono text-slate-400">{acc.code}</div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/kas-bank/${acc.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Atur Akun
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-3 flex flex-col items-center justify-center text-center space-y-5 py-2">
                <div>
                  <div className="text-lg font-bold text-slate-900">0</div>
                  <div className="text-xs text-slate-400">Saldo di bank</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">{fmt(acc.balance)}</div>
                  <div className="text-xs text-slate-400">Saldo di KASKU</div>
                </div>
              </div>
              <div className="lg:col-span-9">
                <AreaChartSVG
                  data={acc.series}
                  color={CHART_COLORS[idx % CHART_COLORS.length]}
                  height={180}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Riwayat Transaksi Kas / Transfer */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Riwayat Transaksi Kas &amp; Transfer</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Memo</th>
              <th className="px-4 py-3 text-right">Jumlah</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transfers.map((t) => {
              const Icon = TYPE_ICONS[t.type] || ArrowRightLeft;
              return (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-700 font-medium">{t.docNo}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TYPE_COLORS[t.type] || ""}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {TYPE_LABELS[t.type] || t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(t.transDate).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-slate-800">{t.memo || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money(t.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteTransfer(t.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              );
            })}
            {transfers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Belum ada transaksi kas/bank.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Transaksi Kas/Bank */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Transaksi Kas &amp; Bank</h2>
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>}
            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
                {(["RECEIVE", "SEND", "TRANSFER", "PRIVE"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 text-xs font-medium rounded-md transition ${
                      type === t ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {type === "RECEIVE"
                    ? "Diterima di (Kas/Bank)"
                    : type === "SEND"
                    ? "Dikirim dari (Kas/Bank)"
                    : type === "PRIVE"
                    ? "Ambil dari (Kas/Bank)"
                    : "Dari Akun"}
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({money(a.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {type === "RECEIVE"
                    ? "Sumber Dana (Akun)"
                    : type === "SEND"
                    ? "Tujuan (Akun Beban)"
                    : type === "PRIVE"
                    ? "Akun Prive/Ekuitas"
                    : "Ke Akun"}
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {(type === "TRANSFER"
                    ? cashAccounts.map((a) => ({ id: a.id, label: `${a.name} (${money(a.balance)})` }))
                    : allAccounts.map((a) => ({ id: a.id, label: `${a.code} — ${a.name}` }))
                  ).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={transDate}
                    onChange={(e) => setTransDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Jumlah</label>
                  <CurrencyInput
                    value={amount}
                    onValueChange={setAmount}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Memo</label>
                <input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Keterangan transfer"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!Number(amount)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Kas & Bank */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Tambah Akun Kas &amp; Bank</h2>
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>}
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kode Akun</label>
                <input
                  required
                  value={accCode}
                  onChange={(e) => setAccCode(e.target.value)}
                  placeholder="Contoh: 1-10003"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Kas / Bank</label>
                <input
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="Contoh: Bank Mandiri / Kartu Kredit"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
