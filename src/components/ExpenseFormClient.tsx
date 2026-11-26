"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";

interface ContactOpt {
  id: string;
  name: string;
}

interface AccountOpt {
  id: string;
  code: string;
  name: string;
}

interface CashOpt {
  id: string;
  name: string;
  balance: number;
}

interface ItemLine {
  accountId: string;
  description: string;
  amount: string;
}

const money = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);

export function ExpenseFormClient({
  mode,
  expenseId,
  initialNo,
  initialContactId,
  initialTransDate,
  initialDueDate,
  initialItems,
  contacts,
  expenseAccounts,
  cashAccounts,
}: {
  mode: "create" | "edit";
  expenseId?: string;
  initialNo: string;
  initialContactId: string;
  initialTransDate: string;
  initialDueDate: string;
  initialItems?: ItemLine[];
  contacts: ContactOpt[];
  expenseAccounts: AccountOpt[];
  cashAccounts: CashOpt[];
}) {
  const router = useRouter();
  const [contactId, setContactId] = useState(initialContactId);
  const [transDate, setTransDate] = useState(initialTransDate);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [payFromAccountId, setPayFromAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [items, setItems] = useState<ItemLine[]>(
    initialItems && initialItems.length > 0
      ? initialItems
      : [{ accountId: expenseAccounts[0]?.id || "", description: "", amount: "0" }]
  );

  const grandTotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        contactId: contactId || null,
        transDate,
        dueDate: payFromAccountId ? null : dueDate || null,
        payFromAccountId: payFromAccountId || null,
        items: items
          .filter((it) => Number(it.amount) > 0)
          .map((it) => ({
            accountId: it.accountId,
            description: it.description || "Biaya operasional",
            amount: Number(it.amount),
          })),
      };

      const res = await fetch(
        mode === "edit" ? `/api/expenses/${expenseId}` : "/api/expenses",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan biaya.");
        return;
      }
      const targetId = mode === "edit" ? expenseId : data.expense?.id;
      router.push(targetId ? `/biaya/${targetId}` : "/biaya");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          {mode === "edit" ? `Edit Biaya ${initialNo}` : "Catat Biaya Baru"}
        </h1>
        <Link
          href={mode === "edit" && expenseId ? `/biaya/${expenseId}` : "/biaya"}
          className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
        >
          Kembali
        </Link>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Kontak (Opsional)
            </label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">— Tanpa Kontak —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nomor</label>
            <input
              disabled
              value={initialNo}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              <span className="text-red-500">*</span> Tgl. Transaksi
            </label>
            <input
              type="date"
              required
              value={transDate}
              onChange={(e) => setTransDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Bayar Dari (Opsional)
            </label>
            <select
              value={payFromAccountId}
              onChange={(e) => setPayFromAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">— Bayar Nanti (Utang Biaya) —</option>
              {cashAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({money(a.balance)})
                </option>
              ))}
            </select>
          </div>
          {!payFromAccountId && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tgl. Jatuh Tempo
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          )}
        </div>

        {/* Expense Items Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-3 w-72">Akun Biaya</th>
                <th className="px-3 py-3">Deskripsi</th>
                <th className="px-3 py-3 w-48 text-right">Jumlah</th>
                <th className="px-2 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td className="p-2">
                    <select
                      value={it.accountId}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx].accountId = e.target.value;
                        setItems(next);
                      }}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      {expenseAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      value={it.description}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx].description = e.target.value;
                        setItems(next);
                      }}
                      placeholder="Keterangan biaya"
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <CurrencyInput
                      value={it.amount}
                      onValueChange={(v) => {
                        const next = [...items];
                        next[idx].amount = v;
                        setItems(next);
                      }}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs text-right"
                    />
                  </td>
                  <td className="p-2 text-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() =>
            setItems([
              ...items,
              { accountId: expenseAccounts[0]?.id || "", description: "", amount: "0" },
            ])
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah baris
        </button>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <div className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-200 text-base font-bold text-slate-900">
              <span>{payFromAccountId ? "Total Dibayar" : "Total Utang Biaya"}</span>
              <span>{money(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Link
            href={mode === "edit" && expenseId ? `/biaya/${expenseId}` : "/biaya"}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={saving || grandTotal <= 0}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : mode === "edit" ? "Simpan Perubahan" : "Simpan Biaya"}
          </button>
        </div>
      </div>
    </form>
  );
}
