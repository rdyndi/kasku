"use client";

import { useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { Printer, Download, Share2, ChevronDown } from "lucide-react";

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

interface ReportShellProps {
  title: string;
  children: ReactNode;
  defaultStartDate?: string;
  defaultEndDate?: string;
  onDateChange?: (startDate: string, endDate: string) => void;
}

export function ReportShell({
  title,
  children,
  defaultStartDate,
  defaultEndDate,
  onDateChange,
}: ReportShellProps) {
  const [startDate, setStartDate] = useState(defaultStartDate ?? "");
  const [endDate, setEndDate] = useState(defaultEndDate ?? "");

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/" className="hover:text-blue-600">
            Beranda
          </Link>
          <span>·</span>
          <Link href="/laporan" className="hover:text-blue-600">
            Laporan
          </Link>
          <span>·</span>
          <span className="font-semibold text-slate-900">{title}</span>
        </div>
        <Link
          href="/laporan"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          ← Kembali
        </Link>
      </div>

      {/* Title + Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Download className="w-3.5 h-3.5" />
              Ekspor
              <ChevronDown className="w-3 h-3" />
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Share2 className="w-3.5 h-3.5" />
              Bagikan
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
          </button>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate && onDateChange) onDateChange(e.target.value, endDate);
              }}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (startDate && onDateChange) onDateChange(startDate, e.target.value);
              }}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            />
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}

/* =================== REUSABLE EXPANDABLE TABLE =================== */

interface VendorRow {
  contactId: string;
  vendorName: string;
  companyName: string;
  totalTransaksi: number;
  nilaiPembelian: number;
  invoices: Array<{
    id: string;
    billNo: string;
    transDate: string;
    dueDate: string;
    status: string;
    grandTotal: number;
  }>;
}

export function PembelianPerVendorTable({ rows }: { rows: VendorRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
          <th className="px-4 py-3 w-8"></th>
          <th className="px-4 py-3">Vendor</th>
          <th className="px-4 py-3">Perusahaan</th>
          <th className="px-4 py-3 text-right">Total Transaksi</th>
          <th className="px-4 py-3 text-right">
            Nilai Pembelian
            <span className="ml-1">↕</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => {
          const isOpen = expanded.has(row.contactId);
          return (
            <ExpandableVendorRow
              key={row.contactId}
              row={row}
              isOpen={isOpen}
              onToggle={() => toggle(row.contactId)}
            />
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
              Tidak ada data pembelian pada periode ini.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function ExpandableVendorRow({
  row,
  isOpen,
  onToggle,
}: {
  row: VendorRow;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3 text-blue-600">
          <span className="text-lg font-bold">{isOpen ? "−" : "+"}</span>
        </td>
        <td className="px-4 py-3">
          <Link
            href={`/kontak`}
            className="text-blue-600 hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {row.vendorName}
          </Link>
        </td>
        <td className="px-4 py-3 text-slate-600">{row.companyName}</td>
        <td className="px-4 py-3 text-right text-slate-800">{row.totalTransaksi}</td>
        <td className="px-4 py-3 text-right font-semibold text-blue-600">
          {formatIDR(row.nilaiPembelian)}
        </td>
      </tr>
      {isOpen &&
        row.invoices.map((inv) => (
          <tr key={inv.id} className="bg-blue-50/30">
            <td className="px-4 py-2"></td>
            <td className="px-4 py-2" colSpan={2}>
              <Link
                href={`/pembelian/${inv.id}`}
                className="text-blue-600 hover:underline text-xs font-mono"
              >
                {inv.billNo}
              </Link>
              <span className="ml-3 text-xs text-slate-500">
                {new Date(inv.transDate).toLocaleDateString("id-ID")}
              </span>
              <span
                className={`ml-3 text-xs font-medium ${
                  inv.status === "PAID"
                    ? "text-emerald-600"
                    : inv.status === "PARTIAL"
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {inv.status === "PAID"
                  ? "Lunas"
                  : inv.status === "PARTIAL"
                  ? "Dibayar Sebagian"
                  : "Belum Dibayar"}
              </span>
            </td>
            <td className="px-4 py-2 text-right text-xs text-slate-500">1</td>
            <td className="px-4 py-2 text-right text-xs text-slate-700">
              {formatIDR(inv.grandTotal)}
            </td>
          </tr>
        ))}
    </>
  );
}

/* =================== PEMBELIAN PER ITEM TABLE =================== */

interface PurchaseItemRow {
  productId: string | null;
  productName: string;
  sku: string;
  unit: string;
  totalQty: number;
  totalNilai: number;
  details: Array<{
    billNo: string;
    transDate: string;
    vendorName: string;
    qty: number;
    unitCost: number;
    lineTotal: number;
  }>;
}

export function PembelianPerItemTable({ rows }: { rows: PurchaseItemRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
          <th className="px-4 py-3 w-8"></th>
          <th className="px-4 py-3">Produk</th>
          <th className="px-4 py-3">SKU</th>
          <th className="px-4 py-3 text-right">Total Kuantitas</th>
          <th className="px-4 py-3 text-right">
            Nilai Pembelian
            <span className="ml-1">↕</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => {
          const key = row.productId ?? row.productName;
          const isOpen = expanded.has(key);
          return (
            <ExpandablePurchaseItemRow
              key={key}
              row={row}
              rowKey={key}
              isOpen={isOpen}
              onToggle={() => toggle(key)}
            />
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
              Tidak ada data pembelian pada periode ini.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function ExpandablePurchaseItemRow({
  row,
  rowKey,
  isOpen,
  onToggle,
}: {
  row: PurchaseItemRow;
  rowKey: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3 text-blue-600">
          <span className="text-lg font-bold">{isOpen ? "−" : "+"}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-blue-600 font-medium">{row.productName}</span>
        </td>
        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.sku}</td>
        <td className="px-4 py-3 text-right text-slate-800">
          {formatIDR(row.totalQty)} {row.unit}
        </td>
        <td className="px-4 py-3 text-right font-semibold text-blue-600">
          {formatIDR(row.totalNilai)}
        </td>
      </tr>
      {isOpen &&
        row.details.map((d, i) => (
          <tr key={`${rowKey}-${i}`} className="bg-blue-50/30">
            <td className="px-4 py-2"></td>
            <td className="px-4 py-2 text-xs text-slate-700" colSpan={2}>
              <span className="font-mono text-blue-600">{d.billNo}</span>
              <span className="ml-3 text-slate-500">
                {new Date(d.transDate).toLocaleDateString("id-ID")}
              </span>
              <span className="ml-3 text-slate-500">{d.vendorName}</span>
            </td>
            <td className="px-4 py-2 text-right text-xs text-slate-600">
              {formatIDR(d.qty)} × {formatIDR(d.unitCost)}
            </td>
            <td className="px-4 py-2 text-right text-xs text-slate-700">
              {formatIDR(d.lineTotal)}
            </td>
          </tr>
        ))}
    </>
  );
}

/* =================== PENJUALAN PER PELANGGAN TABLE =================== */

interface CustomerRow {
  contactId: string;
  customerName: string;
  companyName: string;
  totalTransaksi: number;
  nilaiPenjualan: number;
  invoices: Array<{
    id: string;
    invoiceNo: string;
    transDate: string;
    dueDate: string;
    status: string;
    grandTotal: number;
  }>;
}

export function PenjualanPerPelangganTable({ rows }: { rows: CustomerRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
          <th className="px-4 py-3 w-8"></th>
          <th className="px-4 py-3">Pelanggan</th>
          <th className="px-4 py-3">Perusahaan</th>
          <th className="px-4 py-3 text-right">Total Transaksi</th>
          <th className="px-4 py-3 text-right">
            Nilai Penjualan
            <span className="ml-1">↕</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => {
          const isOpen = expanded.has(row.contactId);
          return (
            <ExpandableCustomerRow
              key={row.contactId}
              row={row}
              isOpen={isOpen}
              onToggle={() => toggle(row.contactId)}
            />
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
              Tidak ada data penjualan pada periode ini.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function ExpandableCustomerRow({
  row,
  isOpen,
  onToggle,
}: {
  row: CustomerRow;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3 text-blue-600">
          <span className="text-lg font-bold">{isOpen ? "−" : "+"}</span>
        </td>
        <td className="px-4 py-3">
          <Link
            href={`/kontak`}
            className="text-blue-600 hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {row.customerName}
          </Link>
        </td>
        <td className="px-4 py-3 text-slate-600">{row.companyName}</td>
        <td className="px-4 py-3 text-right text-slate-800">{row.totalTransaksi}</td>
        <td className="px-4 py-3 text-right font-semibold text-blue-600">
          {formatIDR(row.nilaiPenjualan)}
        </td>
      </tr>
      {isOpen &&
        row.invoices.map((inv) => (
          <tr key={inv.id} className="bg-blue-50/30">
            <td className="px-4 py-2"></td>
            <td className="px-4 py-2" colSpan={2}>
              <Link
                href={`/penjualan/${inv.id}`}
                className="text-blue-600 hover:underline text-xs font-mono"
              >
                {inv.invoiceNo}
              </Link>
              <span className="ml-3 text-xs text-slate-500">
                {new Date(inv.transDate).toLocaleDateString("id-ID")}
              </span>
              <span
                className={`ml-3 text-xs font-medium ${
                  inv.status === "PAID"
                    ? "text-emerald-600"
                    : inv.status === "PARTIAL"
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {inv.status === "PAID"
                  ? "Lunas"
                  : inv.status === "PARTIAL"
                  ? "Dibayar Sebagian"
                  : "Belum Dibayar"}
              </span>
            </td>
            <td className="px-4 py-2 text-right text-xs text-slate-500">1</td>
            <td className="px-4 py-2 text-right text-xs text-slate-700">
              {formatIDR(inv.grandTotal)}
            </td>
          </tr>
        ))}
    </>
  );
}

/* =================== PENJUALAN PER ITEM TABLE =================== */

interface SalesItemRow {
  productId: string | null;
  productName: string;
  sku: string;
  unit: string;
  totalQty: number;
  totalNilai: number;
  details: Array<{
    invoiceNo: string;
    transDate: string;
    customerName: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

export function PenjualanPerItemTable({ rows }: { rows: SalesItemRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
          <th className="px-4 py-3 w-8"></th>
          <th className="px-4 py-3">Produk</th>
          <th className="px-4 py-3">SKU</th>
          <th className="px-4 py-3 text-right">Total Kuantitas</th>
          <th className="px-4 py-3 text-right">
            Nilai Penjualan
            <span className="ml-1">↕</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => {
          const key = row.productId ?? row.productName;
          const isOpen = expanded.has(key);
          return (
            <ExpandableSalesItemRow
              key={key}
              row={row}
              rowKey={key}
              isOpen={isOpen}
              onToggle={() => toggle(key)}
            />
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
              Tidak ada data penjualan pada periode ini.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function ExpandableSalesItemRow({
  row,
  rowKey,
  isOpen,
  onToggle,
}: {
  row: SalesItemRow;
  rowKey: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3 text-blue-600">
          <span className="text-lg font-bold">{isOpen ? "−" : "+"}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-blue-600 font-medium">{row.productName}</span>
        </td>
        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.sku}</td>
        <td className="px-4 py-3 text-right text-slate-800">
          {formatIDR(row.totalQty)} {row.unit}
        </td>
        <td className="px-4 py-3 text-right font-semibold text-blue-600">
          {formatIDR(row.totalNilai)}
        </td>
      </tr>
      {isOpen &&
        row.details.map((d, i) => (
          <tr key={`${rowKey}-${i}`} className="bg-blue-50/30">
            <td className="px-4 py-2"></td>
            <td className="px-4 py-2 text-xs text-slate-700" colSpan={2}>
              <span className="font-mono text-blue-600">{d.invoiceNo}</span>
              <span className="ml-3 text-slate-500">
                {new Date(d.transDate).toLocaleDateString("id-ID")}
              </span>
              <span className="ml-3 text-slate-500">{d.customerName}</span>
            </td>
            <td className="px-4 py-2 text-right text-xs text-slate-600">
              {formatIDR(d.qty)} × {formatIDR(d.unitPrice)}
            </td>
            <td className="px-4 py-2 text-right text-xs text-slate-700">
              {formatIDR(d.lineTotal)}
            </td>
          </tr>
        ))}
    </>
  );
}
