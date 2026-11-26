"use client";

import { useState } from "react";
import { Plus, Scale, Trash2 } from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";

export interface AccountRow {
  id: string;
  code: string;
  name: string;
  category: string;
  normalBalance: string;
  isCashBank: boolean;
  isSystem?: boolean;
  endingBalance: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  asset: "Aset",
  liability: "Liabilitas / Utang",
  equity: "Ekuitas / Modal",
  revenue: "Pendapatan",
  cogs: "Harga Pokok Penjualan",
  expense: "Beban",
};

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function AccountsClient({ initialAccounts }: { initialAccounts: AccountRow[] }) {
  const [accounts, setAccounts] = useState<AccountRow[]>(initialAccounts);
  const [filterCat, setFilterCat] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showOpening, setShowOpening] = useState(false);
  const [error, setError] = useState("");

  // New Account form
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("asset");
  const [isCashBank, setIsCashBank] = useState(false);

  // Opening balance lines
  const [obDate, setObDate] = useState(new Date().toISOString().slice(0, 10));
  const [obLines, setObLines] = useState<
    Array<{ accountId: string; debit: string; credit: string }>
  >([
    { accountId: initialAccounts[0]?.id || "", debit: "0", credit: "0" },
    { accountId: initialAccounts.find((a) => a.category === "equity")?.id || initialAccounts[0]?.id || "", debit: "0", credit: "0" },
  ]);

  async function refreshAccounts() {
    const res = await fetch("/api/accounts");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts);
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, category, isCashBank }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setCode("");
    setName("");
    setIsCashBank(false);
    setShowAdd(false);
    await refreshAccounts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus akun ini?")) return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal menghapus akun.");
      return;
    }
    await refreshAccounts();
  }

  const obTotalDebit = obLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const obTotalCredit = obLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const obBalanced = Math.abs(obTotalDebit - obTotalCredit) < 0.01 && obTotalDebit > 0;

  async function handleSaveOpening(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/opening-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transDate: obDate,
        lines: obLines
          .filter((l) => Number(l.debit) > 0 || Number(l.credit) > 0)
          .map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
          })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setShowOpening(false);
    await refreshAccounts();
  }

  const filtered =
    filterCat === "all" ? accounts : accounts.filter((a) => a.category === filterCat);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Akun / Chart of Accounts (COA)</h1>
          <p className="text-sm text-slate-500">
            Kelola daftar akun perkiraan dan saldo awal neraca perusahaan.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setError("");
              setShowOpening(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            <Scale className="w-4 h-4" />
            Isi Saldo Awal
          </button>
          <button
            onClick={() => {
              setError("");
              setShowAdd(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Tambah Akun
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCat("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${
            filterCat === "all"
              ? "bg-slate-900 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Semua ({accounts.length})
        </button>
        {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilterCat(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              filterCat === k
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama Akun</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Saldo Normal</th>
                <th className="px-4 py-3 text-right">Saldo Saat Ini</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{acc.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {acc.name}
                    {acc.isCashBank && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Kas/Bank
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {CATEGORY_LABELS[acc.category] || acc.category}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{acc.normalBalance}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatIDR(acc.endingBalance)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                      title="Hapus Akun"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Akun */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Tambah Akun Baru</h2>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>
            )}
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kode Akun</label>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Contoh: 1-10003"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Akun</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Bank Mandiri"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isCashBank}
                  onChange={(e) => setIsCashBank(e.target.checked)}
                />
                <span>Termasuk Akun Kas & Bank</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
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

      {/* Modal Saldo Awal */}
      {showOpening && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">Input Saldo Awal Neraca</h2>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>
            )}
            <form onSubmit={handleSaveOpening} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tanggal Saldo Awal
                </label>
                <input
                  type="date"
                  required
                  value={obDate}
                  onChange={(e) => setObDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-2">
                {obLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={line.accountId}
                      onChange={(e) => {
                        const next = [...obLines];
                        next[idx].accountId = e.target.value;
                        setObLines(next);
                      }}
                      className="col-span-6 px-2.5 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                    <CurrencyInput
                      placeholder="Debit"
                      value={line.debit}
                      onValueChange={(v) => {
                        const next = [...obLines];
                        next[idx].debit = v;
                        setObLines(next);
                      }}
                      className="col-span-3 px-2.5 py-2 border border-slate-300 rounded-lg text-sm text-right"
                    />
                    <CurrencyInput
                      placeholder="Kredit"
                      value={line.credit}
                      onValueChange={(v) => {
                        const next = [...obLines];
                        next[idx].credit = v;
                        setObLines(next);
                      }}
                      className="col-span-3 px-2.5 py-2 border border-slate-300 rounded-lg text-sm text-right"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setObLines([
                    ...obLines,
                    { accountId: accounts[0]?.id || "", debit: "0", credit: "0" },
                  ])
                }
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                + Tambah Baris Akun
              </button>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span>
                  Total Debit: <strong>{formatIDR(obTotalDebit)}</strong> | Total Kredit:{" "}
                  <strong>{formatIDR(obTotalCredit)}</strong>
                </span>
                <span className={obBalanced ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                  {obBalanced ? "Seimbang (Balance)" : "Belum Seimbang"}
                </span>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpening(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!obBalanced}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Simpan Saldo Awal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
