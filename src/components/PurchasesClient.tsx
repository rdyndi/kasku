"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BarChart3, Eye, Plus, Printer, Search } from "lucide-react";

type Option = { id: string; name: string };
type Invoice = {
  id: string;
  billNo: string;
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
  };
  const m = map[status] || { label: status, cls: "text-slate-600" };
  return <span className={`text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

export function PurchasesClient({
  invoices,
}: {
  invoices: Invoice[];
  contacts?: Option[];
  products?: unknown[];
  initialTransDate?: string;
  initialDueDate?: string;
}) {
  const router = useRouter();
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAllTotal, setShowAllTotal] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const q = search.trim().toLowerCase();
  const filtered = invoices.filter((inv) => {
    if (statusTab !== "ALL" && inv.status !== statusTab) return false;
    if (
      q &&
      !inv.billNo.toLowerCase().includes(q) &&
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

  function toggleAll() {
    if (selectedIds.length === paged.length) setSelectedIds([]);
    else setSelectedIds(paged.map((p) => p.id));
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-xs">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Tagihan Pembelian</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/laporan"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Laporan
          </Link>
          <Link
            href="/pembelian/buat"
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
          {selectedIds.length > 0 ? `${selectedIds.length} tagihan dipilih` : "Daftar Tagihan Pembelian"}
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
              placeholder="Cari nomor / supplier..."
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
              <th className="px-3 py-3">Supplier</th>
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
                onClick={() => router.push(`/pembelian/${inv.id}`)}
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
                  <Link href={`/pembelian/${inv.id}`} className="text-blue-600 hover:underline">
                    {inv.billNo}
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
                  Belum ada tagihan pembelian.
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
    </div>
  );
}
