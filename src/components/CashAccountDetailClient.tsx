"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  ChevronDown,
  Plus,
  Printer,
  Search,
  UserMinus,
} from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";

interface MovementRow {
  id: string;
  transDate: string;
  entryNo: string;
  memo: string;
  description: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
  status: string;
}

interface AccountOpt {
  id: string;
  code: string;
  name: string;
}

const fmt = (v: number) => Math.round(v || 0).toLocaleString("id-ID");

export function CashAccountDetailClient({
  account,
  movements,
  cashAccounts,
  allAccounts,
  summary,
  initialDate,
}: {
  account: { id: string; code: string; name: string };
  movements: MovementRow[];
  cashAccounts: AccountOpt[];
  allAccounts: AccountOpt[];
  summary: { balance: number; totalInMonth: number; totalOutMonth: number; netMonth: number };
  initialDate: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"kasku" | "bank" | "rekonsiliasi" | "void">("kasku");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Modal state
  const [modalType, setModalType] = useState<"TRANSFER" | "SEND" | "RECEIVE" | "PRIVE" | null>(null);
  const [targetAccountId, setTargetAccountId] = useState(
    cashAccounts.find((c) => c.id !== account.id)?.id || allAccounts[0]?.id || ""
  );
  const [transDate, setTransDate] = useState(initialDate);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  function openNewTx(t: "TRANSFER" | "SEND" | "RECEIVE" | "PRIVE") {
    setModalType(t);
    setMenuOpen(false);
    setError("");
    if (t === "TRANSFER") {
      setTargetAccountId(cashAccounts.find((c) => c.id !== account.id)?.id || account.id);
    } else {
      setTargetAccountId(allAccounts[0]?.id || "");
    }
  }

  async function handleSubmitTx(e: React.FormEvent) {
    e.preventDefault();
    if (!modalType) return;
    setError("");

    const payload =
      modalType === "RECEIVE"
        ? {
            type: "RECEIVE",
            fromAccountId: targetAccountId,
            toAccountId: account.id,
            transDate,
            amount: Number(amount),
            memo,
          }
        : {
            type: modalType,
            fromAccountId: account.id,
            toAccountId: targetAccountId,
            transDate,
            amount: Number(amount),
            memo,
          };

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
    setModalType(null);
    setAmount("");
    setMemo("");
    router.refresh();
  }

  const q = search.trim().toLowerCase();
  const filtered = movements.filter((m) => {
    if (tab === "void" && m.status !== "VOID") return false;
    if (tab === "kasku" && m.status === "VOID") return false;
    if (q && !m.memo.toLowerCase().includes(q) && !m.entryNo.toLowerCase().includes(q)) return false;
    const d = m.transDate.slice(0, 10);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  const modalTitle =
    modalType === "TRANSFER"
      ? "Transfer Dana"
      : modalType === "SEND"
      ? "Kirim Dana"
      : modalType === "RECEIVE"
      ? "Terima Dana"
      : "Prive Pemilik";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-2xl font-bold text-slate-900">{account.name}</h1>
          <span className="text-sm font-mono text-slate-400">{account.code}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Transaksi Baru
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-30 text-xs">
                <button
                  type="button"
                  onClick={() => openNewTx("TRANSFER")}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                  Transfer Dana
                </button>
                <button
                  type="button"
                  onClick={() => openNewTx("SEND")}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
                  Kirim Dana
                </button>
                <button
                  type="button"
                  onClick={() => openNewTx("RECEIVE")}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                  Terima Dana
                </button>
                <button
                  type="button"
                  onClick={() => openNewTx("PRIVE")}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                >
                  <UserMinus className="w-3.5 h-3.5 text-orange-600" />
                  Prive Pemilik
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <Link
            href="/kas-bank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali
          </Link>
        </div>
      </div>

      {/* 4 KPI Summary Cards (Gaya Kledo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-500">SALDO</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{fmt(summary.balance)}</div>
          <div className="mt-1 text-[11px] text-slate-400">Saldo di KASKU saat ini</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-500">MASUK</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{fmt(summary.totalInMonth)}</div>
          <div className="mt-1 text-[11px] text-slate-400">Total masuk bulan ini</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-500">KELUAR</div>
          <div className="mt-2 text-2xl font-bold text-red-600">{fmt(summary.totalOutMonth)}</div>
          <div className="mt-1 text-[11px] text-slate-400">Total keluar bulan ini</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-500">NET</div>
          <div className={`mt-2 text-2xl font-bold ${summary.netMonth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {fmt(summary.netMonth)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Selisih bulan ini</div>
        </div>
      </div>

      {/* Transactions Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari deskripsi atau nomor..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 text-xs font-medium">
          {[
            { key: "kasku", label: "Transaksi di KASKU" },
            { key: "bank", label: "Transaksi di Bank" },
            { key: "rekonsiliasi", label: "Rekonsiliasi" },
            { key: "void", label: "Void" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as typeof tab)}
              className={`px-4 py-2.5 border-b-2 transition ${
                tab === t.key
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "bank" || tab === "rekonsiliasi" ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Fitur mutasi rekening koran bank &amp; rekonsiliasi otomatis tersedia di tahap lanjutan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Deskripsi</th>
                  <th className="px-4 py-3">Referensi</th>
                  <th className="px-4 py-3 text-right">Terima</th>
                  <th className="px-4 py-3 text-right">Kirim</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(m.transDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-blue-600 font-medium">
                      {m.memo}
                      {m.description ? ` — ${m.description}` : ""}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.entryNo}</td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {m.debit > 0 ? fmt(m.debit) : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      {m.credit > 0 ? fmt(m.credit) : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {fmt(m.runningBalance)}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-red-500">Unreconciled</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Belum ada transaksi pada akun ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Transaksi Baru */}
      {modalType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{modalTitle}</h2>
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>}
            <form onSubmit={handleSubmitTx} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {modalType === "RECEIVE"
                    ? "Sumber Dana (Akun)"
                    : modalType === "TRANSFER"
                    ? "Transfer Ke Akun Kas/Bank"
                    : modalType === "PRIVE"
                    ? "Akun Prive / Ekuitas"
                    : "Akun Tujuan / Beban"}
                </label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {(modalType === "TRANSFER" ? cashAccounts : allAccounts).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi / Memo</label>
                <input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Contoh: Kirim dana operasional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
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
    </div>
  );
}
