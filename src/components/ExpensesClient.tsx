"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleDollarSign, Plus, X } from "lucide-react";
import { BulkPaymentModal } from "@/components/BulkPaymentModal";

type Option = { id: string; name: string };
type ExpenseRow = {
  id: string;
  expenseNo: string;
  transDate: string;
  status: string;
  grandTotal: number;
  paidAmount: number;
  contact: Option | null;
};

const money = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-800",
    PAID: "bg-green-100 text-green-800",
  };
  const labels: Record<string, string> = {
    OPEN: "Belum Lunas",
    PAID: "Lunas",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || "bg-slate-100"}`}>
      {labels[status] || status}
    </span>
  );
}

export function ExpensesClient({
  expenses,
}: {
  expenses: ExpenseRow[];
  contacts?: Option[];
  expenseAccounts?: unknown[];
  cashAccounts?: unknown[];
  initialDate?: string;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPayOpen, setBulkPayOpen] = useState(false);

  function toggleAll() {
    if (selectedIds.length === expenses.length) setSelectedIds([]);
    else setSelectedIds(expenses.map((e) => e.id));
  }

  const openTotal = expenses
    .filter((e) => e.status !== "PAID")
    .reduce((s, e) => s + Math.max(0, e.grandTotal - e.paidAmount), 0);
  const paidTotal = expenses.reduce((s, e) => s + e.paidAmount, 0);

  return (
    <div>
      {/* Mobile View */}
      <div className="block lg:hidden space-y-3 pb-20">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Utang Biaya</div>
            <div className="mt-1 text-sm font-bold text-rose-600">{money(openTotal)}</div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Dibayar</div>
            <div className="mt-1 text-sm font-bold text-emerald-600">{money(paidTotal)}</div>
          </div>
        </div>

        <div className="space-y-2.5">
          {expenses.map((exp) => (
            <Link
              key={exp.id}
              href={`/biaya/${exp.id}`}
              className="block bg-white rounded-2xl border border-slate-100 p-4 shadow-xs active:scale-[0.99] transition"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-bold text-blue-600 text-sm">{exp.expenseNo}</span>
                <StatusBadge status={exp.status} />
              </div>
              <div className="text-sm font-semibold text-slate-800 truncate">
                {exp.contact?.name || "Pengeluaran Umum"}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2.5 mt-2.5 border-t border-slate-100">
                <span>{new Date(exp.transDate).toLocaleDateString("id-ID")}</span>
                <span className="text-sm font-bold text-slate-900">{money(exp.grandTotal)}</span>
              </div>
            </Link>
          ))}
          {expenses.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
              Belum ada catatan biaya.
            </div>
          )}
        </div>

        <Link
          href="/biaya/buat"
          aria-label="Catat Biaya Baru"
          className="fixed bottom-6 right-5 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center z-30 active:scale-95 transition"
        >
          <Plus className="w-6 h-6" />
        </Link>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Biaya / Pengeluaran</h1>
          <p className="text-sm text-slate-500">
            Catat biaya operasional, kasbon, edit/hapus, dan pantau riwayat pembayarannya.
          </p>
        </div>
        <Link
          href="/biaya/buat"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Catat Biaya
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase">Utang Biaya</div>
          <div className="mt-1 text-xl font-bold text-red-600">{money(openTotal)}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase">Total Dibayar</div>
          <div className="mt-1 text-xl font-bold text-emerald-600">{money(paidTotal)}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase">Jumlah Biaya</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{expenses.length}</div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkPayOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition"
          >
            <CircleDollarSign className="w-3.5 h-3.5 text-slate-600" />
            Set Lunas
          </button>
          <span className="text-xs font-semibold text-blue-600 ml-1">
            Tampilkan {selectedIds.length} baris dipilih
          </span>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            title="Batalkan pilihan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={expenses.length > 0 && selectedIds.length === expenses.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3">Kontak</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Sisa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((exp) => {
              const balanceDue = Math.max(0, exp.grandTotal - exp.paidAmount);
              return (
                <tr
                  key={exp.id}
                  onClick={() => router.push(`/biaya/${exp.id}`)}
                  className="hover:bg-blue-50/40 cursor-pointer"
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(exp.id)}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(exp.id) ? prev.filter((x) => x !== exp.id) : [...prev, exp.id]
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-medium">
                    <Link href={`/biaya/${exp.id}`} className="text-blue-600 hover:underline">
                      {exp.expenseNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{exp.contact?.name || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(exp.transDate).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={exp.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{money(exp.grandTotal)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">
                    {money(balanceDue)}
                  </td>
                </tr>
              );
            })}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Belum ada pencatatan biaya.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <BulkPaymentModal
        open={bulkPayOpen}
        onClose={() => setBulkPayOpen(false)}
        onSuccess={() => {
          setBulkPayOpen(false);
          setSelectedIds([]);
          router.refresh();
        }}
        type="EXPENSE"
        selectedItems={expenses
          .filter((exp) => selectedIds.includes(exp.id))
          .map((exp) => ({
            id: exp.id,
            docNo: exp.expenseNo,
            contactName: exp.contact?.name || "Tanpa Kontak",
            status: exp.status,
            balanceDue: Math.max(0, exp.grandTotal - exp.paidAmount),
          }))}
      />
      </div>
    </div>
  );
}
