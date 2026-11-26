"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface ContactOption {
  id: string;
  name: string;
  type: string;
}

interface JournalRow {
  id: string;
  entryNo: string;
  transDate: string;
  memo: string;
  sourceType: string;
  lines: Array<{
    id: string;
    debit: number;
    credit: number;
    description: string | null;
    account: { id: string; code: string; name: string };
    contact: { id: string; name: string } | null;
  }>;
}

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function JournalsClient({
  initialJournals,
  accounts,
  contacts,
}: {
  initialJournals: JournalRow[];
  accounts: AccountOption[];
  contacts: ContactOption[];
}) {
  const [journals, setJournals] = useState<JournalRow[]>(initialJournals);
  const [showAdd, setShowAdd] = useState(false);
  const [transDate, setTransDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState([
    { accountId: accounts[0]?.id || "", contactId: "", description: "", debit: "0", credit: "0" },
    { accountId: accounts[1]?.id || accounts[0]?.id || "", contactId: "", description: "", debit: "0", credit: "0" },
  ]);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch("/api/journals");
    if (res.ok) {
      const data = await res.json();
      setJournals(
        data.journals.map((j: JournalRow) => ({
          ...j,
          lines: j.lines.map((l) => ({
            ...l,
            debit: Number(l.debit),
            credit: Number(l.credit),
          })),
        }))
      );
    }
  }

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/journals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transDate,
        memo,
        lines: lines
          .filter((l) => Number(l.debit) > 0 || Number(l.credit) > 0)
          .map((l) => ({
            accountId: l.accountId,
            contactId: l.contactId || null,
            description: l.description || null,
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
    setMemo("");
    setShowAdd(false);
    await refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus jurnal ini?")) return;
    const res = await fetch(`/api/journals/${id}`, { method: "DELETE" });
    if (res.ok) await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jurnal Umum</h1>
          <p className="text-sm text-slate-500">
            Catat transaksi keuangan manual dengan sistem double-entry (Debit = Kredit).
          </p>
        </div>
        <button
          onClick={() => {
            setError("");
            setShowAdd(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tambah Jurnal Umum
        </button>
      </div>

      <div className="space-y-4">
        {journals.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            Belum ada jurnal tercatat.
          </div>
        ) : (
          journals.map((j) => {
            const sumDebit = j.lines.reduce((s, l) => s + Number(l.debit), 0);
            return (
              <div key={j.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-800">
                      {j.entryNo}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{j.memo}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(j.transDate).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-900">{formatIDR(sumDebit)}</span>
                    <button
                      onClick={() => handleDelete(j.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                      title="Hapus Jurnal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                      <th className="px-5 py-2">Akun</th>
                      <th className="px-5 py-2">Kontak</th>
                      <th className="px-5 py-2">Keterangan</th>
                      <th className="px-5 py-2 text-right">Debit</th>
                      <th className="px-5 py-2 text-right">Kredit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {j.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-5 py-2 text-slate-800">
                          <span className="font-mono text-xs text-slate-500 mr-2">
                            {l.account.code}
                          </span>
                          {l.account.name}
                        </td>
                        <td className="px-5 py-2 text-slate-500 text-xs">
                          {l.contact?.name || "—"}
                        </td>
                        <td className="px-5 py-2 text-slate-600 text-xs">
                          {l.description || "—"}
                        </td>
                        <td className="px-5 py-2 text-right font-medium text-slate-900">
                          {Number(l.debit) > 0 ? formatIDR(Number(l.debit)) : "—"}
                        </td>
                        <td className="px-5 py-2 text-right font-medium text-slate-900">
                          {Number(l.credit) > 0 ? formatIDR(Number(l.credit)) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tambah Jurnal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">Tambah Jurnal Umum</h2>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Memo / Keterangan Transaksi
                  </label>
                  <input
                    required
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="Contoh: Pembayaran listrik kantor bulan ini"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                  <div className="col-span-4">Akun</div>
                  <div className="col-span-2">Kontak</div>
                  <div className="col-span-2">Deskripsi</div>
                  <div className="col-span-2 text-right">Debit</div>
                  <div className="col-span-2 text-right">Kredit</div>
                </div>
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={line.accountId}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx].accountId = e.target.value;
                        setLines(next);
                      }}
                      className="col-span-4 px-2 py-2 border border-slate-300 rounded-lg text-xs"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={line.contactId}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx].contactId = e.target.value;
                        setLines(next);
                      }}
                      className="col-span-2 px-2 py-2 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">—</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={line.description}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx].description = e.target.value;
                        setLines(next);
                      }}
                      placeholder="Catatan"
                      className="col-span-2 px-2 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                    <CurrencyInput
                      value={line.debit}
                      onValueChange={(v) => {
                        const next = [...lines];
                        next[idx].debit = v;
                        setLines(next);
                      }}
                      className="col-span-2 px-2 py-2 border border-slate-300 rounded-lg text-xs text-right"
                    />
                    <CurrencyInput
                      value={line.credit}
                      onValueChange={(v) => {
                        const next = [...lines];
                        next[idx].credit = v;
                        setLines(next);
                      }}
                      className="col-span-2 px-2 py-2 border border-slate-300 rounded-lg text-xs text-right"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setLines([
                    ...lines,
                    {
                      accountId: accounts[0]?.id || "",
                      contactId: "",
                      description: "",
                      debit: "0",
                      credit: "0",
                    },
                  ])
                }
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                + Tambah Baris
              </button>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span>
                  Total Debit: <strong>{formatIDR(totalDebit)}</strong> | Total Kredit:{" "}
                  <strong>{formatIDR(totalCredit)}</strong>
                </span>
                <span className={isBalanced ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                  {isBalanced ? "Seimbang (Siap Posting)" : "Debit & Kredit harus sama"}
                </span>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Posting Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
