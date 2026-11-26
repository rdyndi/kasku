"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, X } from "lucide-react";

export type BulkPaymentItem = {
  id: string;
  docNo: string;
  contactName: string;
  status: string;
  balanceDue: number;
};

type CashAccount = {
  id: string;
  code: string;
  name: string;
  balance: number;
};

const fmtNum = (v: number) => Math.round(v || 0).toLocaleString("id-ID");

export function BulkPaymentModal({
  open,
  onClose,
  onSuccess,
  type,
  selectedItems,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: "SALES_INVOICE" | "PURCHASE_INVOICE" | "EXPENSE";
  selectedItems: BulkPaymentItem[];
}) {
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [cashAccountId, setCashAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const payableItems = selectedItems.filter(
    (item) => item.status !== "PAID" && item.status !== "VOID" && item.balanceDue > 0.01
  );
  const nonPayableItems = selectedItems.filter(
    (item) => item.status === "PAID" || item.status === "VOID" || item.balanceDue <= 0.01
  );

  useEffect(() => {
    if (!open) return;
    setError("");
    setReference("");
    setShowDetails(false);
    const initial: Record<string, number> = {};
    for (const item of selectedItems) {
      if (item.status !== "PAID" && item.status !== "VOID" && item.balanceDue > 0.01) {
        initial[item.id] = item.balanceDue;
      }
    }
    setAmounts(initial);

    if (cashAccounts.length === 0) {
      fetch("/api/accounts/cash-bank")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const list: CashAccount[] = d?.accounts || [];
          setCashAccounts(list);
          if (list.length > 0) setCashAccountId(list[0].id);
        })
        .catch(() => {});
    }
  }, [open, selectedItems, cashAccounts.length]);

  if (!open) return null;

  const totalPayable = payableItems.reduce((sum, item) => sum + (Number(amounts[item.id]) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cashAccountId) {
      setError("Pilih akun kas/bank terlebih dahulu.");
      return;
    }
    if (payableItems.length === 0) {
      setError("Tidak ada tagihan yang bisa dilunaskan.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/payments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          cashAccountId,
          paymentDate,
          reference: reference.trim() || undefined,
          items: payableItems.map((item) => ({
            id: item.id,
            amount: Number(amounts[item.id]) || item.balanceDue,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memproses pembayaran massal.");
        return;
      }
      onSuccess();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Pembayaran Massal</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Akun Kas & Tgl Transaksi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                <span className="text-red-500">*</span>{" "}
                {type === "SALES_INVOICE" ? "Dibayar Ke" : "Dibayar Dari"}
              </label>
              <select
                required
                value={cashAccountId}
                onChange={(e) => setCashAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {cashAccounts.length === 0 && <option value="">Memuat akun kas/bank...</option>}
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                <span className="text-red-500">*</span> Tgl. Transaksi
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 2: Referensi */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Referensi</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Referensi"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Summary Box */}
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-800">
                Bisa dilunaskan{" "}
                <span className="text-slate-400 font-normal">({payableItems.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">{fmtNum(totalPayable)}</span>
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  className="text-slate-500 hover:text-blue-600 p-1 rounded"
                  title="Ubah jumlah pelunasan"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center justify-between text-slate-400">
              <div className="text-sm">
                Tidak bisa dilunaskan <span>({nonPayableItems.length})</span>
              </div>
              <span className="text-sm">0</span>
            </div>
          </div>

          {/* Expandable Details */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {showDetails ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              Tampilkan jumlah pelunasan
            </button>

            {showDetails && payableItems.length > 0 && (
              <div className="mt-3 max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {payableItems.map((item) => (
                  <div
                    key={item.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-blue-600">{item.docNo}</div>
                      <div className="text-slate-500 truncate">{item.contactName}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-400">Sisa: {fmtNum(item.balanceDue)}</span>
                      <input
                        type="number"
                        min={1}
                        max={item.balanceDue}
                        value={amounts[item.id] ?? item.balanceDue}
                        onChange={(e) =>
                          setAmounts((prev) => ({
                            ...prev,
                            [item.id]: Math.min(Number(e.target.value) || 0, item.balanceDue),
                          }))
                        }
                        className="w-28 px-2.5 py-1 border border-slate-300 rounded-lg text-right font-medium text-slate-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || payableItems.length === 0}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Memproses..." : "Lanjut"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
