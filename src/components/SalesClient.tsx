"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  BarChart3,
  Calendar,
  Check,
  CheckSquare,
  ChevronRight,
  CircleDollarSign,
  Eye,
  FileText,
  Plus,
  Printer,
  Search,
  X,
} from "lucide-react";
import { BulkPaymentModal } from "@/components/BulkPaymentModal";

type Option = { id: string; name: string };
type Invoice = {
  id: string;
  invoiceNo: string;
  transDate: string;
  dueDate: string;
  status: string;
  grandTotal: number;
  balanceDue: number;
  contact: Option;
  itemCount: number;
};

const fmtNum = (v: number) => Math.round(v || 0).toLocaleString("id-ID");

const STATUS_TABS = [
  { key: "ALL", label: "Semua" },
  { key: "OPEN", label: "Belum Dibayar" },
  { key: "PARTIAL", label: "Dibayar Sebagian" },
  { key: "PAID", label: "Lunas" },
  { key: "VOID", label: "Void" },
] as const;

function StatusText({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    OPEN: { label: "Belum Dibayar", cls: "text-red-500" },
    PARTIAL: { label: "Dibayar Sebagian", cls: "text-orange-500" },
    PAID: { label: "Lunas", cls: "text-emerald-600" },
    VOID: { label: "Void", cls: "text-slate-400" },
    DRAFT: { label: "Draf", cls: "text-slate-500" },
  };
  const m = map[status] || { label: status, cls: "text-slate-600" };
  return <span className={`text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

export function SalesClient({
  invoices,
}: {
  invoices: Invoice[];
  contacts?: Option[];
  products?: unknown[];
  warehouses?: unknown[];
  initialTransDate?: string;
  initialDueDate?: string;
}) {
  const router = useRouter();
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPayOpen, setBulkPayOpen] = useState(false);
  const [showAllTotal, setShowAllTotal] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const q = search.trim().toLowerCase();
  const filtered = invoices.filter((inv) => {
    if (statusTab !== "ALL" && inv.status !== statusTab) return false;
    if (
      q &&
      !inv.invoiceNo.toLowerCase().includes(q) &&
      !(inv.contact?.name || "").toLowerCase().includes(q)
    ) {
      return false;
    }
    const d = inv.transDate.slice(0, 10);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const pageBalanceSum = paged.reduce((s, i) => s + i.balanceDue, 0);
  const pageGrandSum = paged.reduce((s, i) => s + i.grandTotal, 0);
  const allBalanceSum = filtered.reduce((s, i) => s + i.balanceDue, 0);
  const allGrandSum = filtered.reduce((s, i) => s + i.grandTotal, 0);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  function toggleAll() {
    if (selectedIds.length === paged.length) setSelectedIds([]);
    else setSelectedIds(paged.map((p) => p.id));
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function startPress(id: string) {
    longPressTriggered.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(25);
      }
    }, 420);
  }

  function cancelPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleMobileCardClick(e: React.MouseEvent, id: string) {
    if (longPressTriggered.current) {
      e.preventDefault();
      longPressTriggered.current = false;
      return;
    }
    if (selectedIds.length > 0) {
      e.preventDefault();
      toggleItem(id);
    }
  }

  return (
    <div>
      {/* Mobile View */}
      <div className="block lg:hidden space-y-3 pb-20">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nomor / pelanggan..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        {/* Horizontal Status Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setStatusTab(t.key);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                statusTab === t.key
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Summary Strip */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>{filtered.length} tagihan</span>
          <span>
            Total: <strong className="text-slate-900">Rp {fmtNum(allGrandSum)}</strong>
          </span>
        </div>

        {/* Mobile Invoice Cards */}
        <div className="space-y-2.5">
          {paged.map((inv) => {
            const isSelected = selectedIds.includes(inv.id);
            const iconBoxCls =
              inv.status === "PAID"
                ? "bg-emerald-50 text-emerald-600"
                : inv.status === "PARTIAL"
                ? "bg-amber-50 text-amber-600"
                : inv.status === "OPEN"
                ? "bg-rose-50 text-rose-500"
                : "bg-slate-100 text-slate-400";
            const badgeCls =
              inv.status === "PAID"
                ? "bg-emerald-50 text-emerald-700"
                : inv.status === "PARTIAL"
                ? "bg-amber-50 text-amber-700"
                : inv.status === "OPEN"
                ? "bg-rose-50 text-rose-600"
                : "bg-slate-100 text-slate-500";
            const amountCls =
              inv.status === "OPEN"
                ? "text-rose-500"
                : inv.status === "PAID"
                ? "text-emerald-600"
                : "text-slate-900";
            const badgeLabel =
              inv.status === "PAID"
                ? "Lunas"
                : inv.status === "PARTIAL"
                ? "Dibayar Sebagian"
                : inv.status === "OPEN"
                ? "Belum Dibayar"
                : inv.status === "VOID"
                ? "Void"
                : inv.status;
            return (
              <Link
                key={inv.id}
                href={`/penjualan/${inv.id}`}
                onClick={(e) => handleMobileCardClick(e, inv.id)}
                onTouchStart={() => startPress(inv.id)}
                onTouchEnd={cancelPress}
                onTouchMove={cancelPress}
                onMouseDown={() => startPress(inv.id)}
                onMouseUp={cancelPress}
                onMouseLeave={cancelPress}
                onContextMenu={(e) => e.preventDefault()}
                className={`block bg-white rounded-2xl border p-4 shadow-xs select-none transition ${
                  isSelected
                    ? "border-emerald-400 ring-2 ring-emerald-500/20"
                    : "border-slate-100 active:scale-[0.99]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBoxCls}`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {inv.contact?.name || "Pelanggan Umum"}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">{inv.invoiceNo}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className={`text-sm font-bold ${amountCls}`}>
                        {fmtNum(inv.grandTotal)}
                      </div>
                      {inv.balanceDue > 0 && inv.balanceDue !== inv.grandTotal && (
                        <div className="text-[10px] text-slate-400">
                          Sisa {fmtNum(inv.balanceDue)}
                        </div>
                      )}
                    </div>
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2.5 mt-2.5 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(inv.transDate).toLocaleDateString("id-ID")}
                  </span>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeCls}`}>
                    {badgeLabel}
                  </span>
                </div>
              </Link>
            );
          })}
          {paged.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
              Tidak ada tagihan penjualan.
            </div>
          )}
        </div>

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-full text-xs font-semibold ${
                  p === safePage
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Mobile FAB */}
        <Link
          href="/penjualan/buat"
          aria-label="Buat Tagihan Baru"
          className={`fixed right-5 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center z-30 active:scale-95 transition-all ${
            selectedIds.length > 0 ? "bottom-24" : "bottom-6"
          }`}
        >
          <Plus className="w-6 h-6" />
        </Link>

        {/* Mobile Multi-Select Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <>
            <div className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-40">
              <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-lg">
                <span>{selectedIds.length} dipilih</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-slate-300 hover:text-white"
                  aria-label="Batalkan pilihan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
              <button
                type="button"
                onClick={toggleAll}
                className="flex-1 py-2.5 px-3 rounded-xl border border-blue-600 text-blue-600 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition"
              >
                <CheckSquare className="w-4 h-4" />
                <span>{selectedIds.length === paged.length ? "Batal Pilih" : "Pilih Semua"}</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkPayOpen(true)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Set Lunas</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-xs">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Tagihan</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/laporan"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Laporan
          </Link>
          <Link
            href="/penjualan/buat"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Filter & Date Range */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-medium text-slate-500">
          {selectedIds.length > 0 ? `${selectedIds.length} tagihan dipilih` : "Daftar Tagihan Penjualan"}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nomor / pelanggan..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5 border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="outline-none"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="outline-none"
            />
          </div>
        </div>
      </div>

      {/* Status Segmented Tabs */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto">
        <div className="inline-flex rounded-t-lg border border-b-0 border-slate-300 overflow-hidden">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setStatusTab(t.key);
                setPage(1);
              }}
              className={`px-3.5 py-2 text-xs font-medium border-r border-slate-200 last:border-r-0 transition whitespace-nowrap ${
                statusTab === t.key
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 py-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkPayOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition"
            >
              <CircleDollarSign className="w-3.5 h-3.5 text-slate-600" />
              Set Lunas
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print
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
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-y border-slate-200 text-left text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={paged.length > 0 && selectedIds.length === paged.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-3 py-3">Nomor</th>
              <th className="px-3 py-3">Pelanggan</th>
              <th className="px-3 py-3">Tanggal</th>
              <th className="px-3 py-3">Tgl. Jatuh Tempo</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Sisa Tagihan</th>
              <th className="px-3 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.map((inv) => (
              <tr
                key={inv.id}
                onClick={() => router.push(`/penjualan/${inv.id}`)}
                className="hover:bg-blue-50/40 cursor-pointer"
              >
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(inv.id)}
                    onChange={() =>
                      setSelectedIds((prev) =>
                        prev.includes(inv.id) ? prev.filter((x) => x !== inv.id) : [...prev, inv.id]
                      )
                    }
                  />
                </td>
                <td className="px-3 py-3 font-mono text-xs font-medium">
                  <Link href={`/penjualan/${inv.id}`} className="text-blue-600 hover:underline">
                    {inv.invoiceNo}
                  </Link>
                </td>
                <td className="px-3 py-3 text-slate-800">{inv.contact?.name}</td>
                <td className="px-3 py-3 text-slate-600">
                  {new Date(inv.transDate).toLocaleDateString("id-ID")}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {new Date(inv.dueDate).toLocaleDateString("id-ID")}
                </td>
                <td className="px-3 py-3">
                  <StatusText status={inv.status} />
                </td>
                <td className="px-3 py-3 text-right font-medium text-slate-900">
                  {fmtNum(inv.balanceDue)}
                </td>
                <td className="px-3 py-3 text-right font-medium text-slate-900">
                  {fmtNum(inv.grandTotal)}
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  Belum ada tagihan penjualan.
                </td>
              </tr>
            )}
          </tbody>
          {paged.length > 0 && (
            <tfoot className="border-t border-slate-200 text-xs font-bold text-slate-900">
              <tr className="border-b border-slate-100">
                <td colSpan={6} className="px-3 py-3">
                  Subtotal
                </td>
                <td className="px-3 py-3 text-right">{fmtNum(pageBalanceSum)}</td>
                <td className="px-3 py-3 text-right">{fmtNum(pageGrandSum)}</td>
              </tr>
              <tr>
                <td colSpan={6} className="px-3 py-3">
                  Total
                </td>
                <td className="px-3 py-3 text-right">
                  {showAllTotal ? (
                    fmtNum(allBalanceSum)
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAllTotal(true)}
                      className="inline-flex items-center gap-1 text-blue-600 font-medium hover:underline"
                    >
                      Lihat Total <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  {showAllTotal ? (
                    fmtNum(allGrandSum)
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAllTotal(true)}
                      className="inline-flex items-center gap-1 text-blue-600 font-medium hover:underline"
                    >
                      Lihat Total <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-slate-600 pt-2">
        <span>Total {filtered.length} data</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`w-7 h-7 rounded border text-xs font-medium ${
                p === safePage
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value));
            setPage(1);
          }}
          className="px-2 py-1 border border-slate-300 rounded text-xs"
        >
          <option value={15}>15 / halaman</option>
          <option value={30}>30 / halaman</option>
          <option value={50}>50 / halaman</option>
        </select>
      </div>
      <BulkPaymentModal
        open={bulkPayOpen}
        onClose={() => setBulkPayOpen(false)}
        onSuccess={() => {
          setBulkPayOpen(false);
          setSelectedIds([]);
          router.refresh();
        }}
        type="SALES_INVOICE"
        selectedItems={invoices
          .filter((inv) => selectedIds.includes(inv.id))
          .map((inv) => ({
            id: inv.id,
            docNo: inv.invoiceNo,
            contactName: inv.contact?.name || "-",
            status: inv.status,
            balanceDue: inv.balanceDue,
          }))}
      />
      </div>
    </div>
  );
}
