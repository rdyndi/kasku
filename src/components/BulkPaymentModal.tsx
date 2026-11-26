"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pencil,
  X,
} from "lucide-react";

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
  const [paidCount, setPaidCount] = useState<number | null>(null);
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
    setPaidCount(null);
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
      setPaidCount(payableItems.length);
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  }

  // ====================================================
  // SUCCESS SCREEN (Matches Screenshot 1)
  // ====================================================
  if (paidCount !== null) {
    return (
      <>
        {/* Mobile Fullscreen Success */}
        <div className="lg:hidden fixed inset-0 bg-white z-50 flex flex-col">
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-slate-100">
            <button
              type="button"
              onClick={onSuccess}
              className="p-1 -ml-1 text-blue-600"
              aria-label="Kembali"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-base font-bold text-blue-600">Pembayaran Massal</h2>
            <div className="w-6" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              Total {paidCount} data telah berhasil dilunaskan
            </p>
          </div>

          <div className="p-4 border-t border-slate-100 bg-white">
            <button
              type="button"
              onClick={onSuccess}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Ok</span>
            </button>
          </div>
        </div>

        {/* Desktop Modal Success */}
        <div
          className="hidden lg:flex fixed inset-0 bg-black/40 items-center justify-center p-4 z-50"
          onClick={onSuccess}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl border border-slate-200 text-center space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Pembayaran Massal Berhasil</h3>
              <p className="text-sm text-slate-600">
                Total {paidCount} data telah berhasil dilunaskan
              </p>
            </div>
            <button
              type="button"
              onClick={onSuccess}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Ok</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ==================================================== */}
      {/* MOBILE FULLSCREEN FORM (Matches Screenshot 2) */}
      {/* ==================================================== */}
      <div className="lg:hidden fixed inset-0 bg-white z-50 flex flex-col">
        {/* Top Bar */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="p-1 -ml-1 text-blue-600"
            aria-label="Kembali"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-base font-bold text-blue-600">Pembayaran Massal</h2>
          <div className="w-6" />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {/* Summary Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden text-sm">
              <div className="bg-slate-50 px-4 py-2.5 font-medium text-slate-700 border-b border-slate-200">
                Bisa dilunaskan
              </div>
              <div className="grid grid-cols-2 border-b border-slate-200">
                <div className="px-4 py-3 text-slate-700 border-r border-slate-200">
                  Total Transaksi
                </div>
                <div className="px-4 py-3 text-center font-semibold text-slate-900">
                  {payableItems.length}
                </div>
              </div>
              <div className="grid grid-cols-2 border-b border-slate-200">
                <div className="px-4 py-3 text-slate-700 border-r border-slate-200">
                  Total Tagihan
                </div>
                <div className="px-4 py-3 text-center font-semibold text-slate-900">
                  {fmtNum(totalPayable)}
                </div>
              </div>

              <div className="bg-slate-50 px-4 py-2.5 font-medium text-slate-700 border-b border-slate-200">
                Tidak bisa dilunaskan
              </div>
              <div className="grid grid-cols-2 border-b border-slate-200">
                <div className="px-4 py-3 text-slate-700 border-r border-slate-200">
                  Total Transaksi
                </div>
                <div className="px-4 py-3 text-center font-semibold text-slate-900">
                  {nonPayableItems.length}
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="px-4 py-3 text-slate-700 border-r border-slate-200">
                  Total Tagihan
                </div>
                <div className="px-4 py-3 text-center font-semibold text-slate-900">0</div>
              </div>
            </div>

            {/* Clean Underline Inputs */}
            <div className="space-y-4 px-1">
              <div className="border-b border-slate-200 pb-2">
                <label className="block text-xs text-slate-400 mb-1">
                  {type === "SALES_INVOICE" ? "Dibayar Ke" : "Dibayar Dari"}
                </label>
                <select
                  required
                  value={cashAccountId}
                  onChange={(e) => setCashAccountId(e.target.value)}
                  className="w-full text-sm font-medium text-slate-900 bg-transparent outline-none"
                >
                  {cashAccounts.length === 0 && <option value="">Memuat akun kas/bank...</option>}
                  {cashAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-b border-slate-200 pb-2">
                <label className="block text-xs text-slate-400 mb-1">Tgl Transaksi</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full text-sm font-medium text-slate-900 bg-transparent outline-none"
                />
              </div>

              <div className="border-b border-slate-200 pb-2">
                <label className="block text-xs text-slate-400 mb-1">Referensi</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Referensi"
                  className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
                />
              </div>

              <div className="border-b border-slate-200 pb-2">
                <label className="block text-xs text-slate-400 mb-1">Total pembayaran</label>
                <div className="text-sm font-semibold text-slate-900">
                  {fmtNum(totalPayable)}
                </div>
              </div>
            </div>

            {/* Accordion: Tampilkan jumlah pelunasan */}
            <div>
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="w-full bg-slate-100 rounded-xl px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-800"
              >
                <span>Tampilkan jumlah pelunasan</span>
                {showDetails ? (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                )}
              </button>

              {showDetails && payableItems.length > 0 && (
                <div className="mt-2.5 border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {payableItems.map((item) => (
                    <div
                      key={item.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-semibold text-blue-600">{item.docNo}</div>
                        <div className="text-slate-500 truncate">{item.contactName}</div>
                      </div>
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
                        className="w-28 px-2.5 py-1.5 border border-slate-300 rounded-lg text-right font-semibold text-slate-900"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {error}
              </div>
            )}
          </div>

          {/* Sticky Bottom Button */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <button
              type="submit"
              disabled={submitting || payableItems.length === 0}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-[0.99] transition"
            >
              <ArrowRight className="w-4 h-4" />
              <span>{submitting ? "Memproses..." : "Lanjut"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ==================================================== */}
      {/* DESKTOP MODAL */}
      {/* ==================================================== */}
      <div
        className="hidden lg:flex fixed inset-0 bg-black/40 items-center justify-center p-4 z-50"
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
    </>
  );
}
