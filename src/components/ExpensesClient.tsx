"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

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

  const openTotal = expenses
    .filter((e) => e.status !== "PAID")
    .reduce((s, e) => s + Math.max(0, e.grandTotal - e.paidAmount), 0);
  const paidTotal = expenses.reduce((s, e) => s + e.paidAmount, 0);

  return (
    <div className="space-y-6">
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
            <tr>
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
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Belum ada pencatatan biaya.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
