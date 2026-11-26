"use client";

import { useState } from "react";
import { Download, Printer, RefreshCw, Share2, SlidersHorizontal } from "lucide-react";

interface PLRow {
  id: string;
  code: string;
  name: string;
  current: number;
  previous: number;
}

export interface PLData {
  year: number;
  compare: boolean;
  revenues: PLRow[];
  cogs: PLRow[];
  opExpenses: PLRow[];
  otherExpenses: PLRow[];
  financingExpenses: PLRow[];
  totalRevenue: number;
  prevTotalRevenue: number;
  totalCogs: number;
  prevTotalCogs: number;
  grossProfit: number;
  prevGrossProfit: number;
  totalOpExpense: number;
  prevTotalOpExpense: number;
  operatingProfit: number;
  prevOperatingProfit: number;
  netProfit: number;
  prevNetProfit: number;
}

function fmtKledo(val: number): string {
  const n = Math.round(Number(val) || 0);
  if (n === 0) return "-";
  const abs = Math.abs(n).toLocaleString("id-ID");
  return n < 0 ? `(${abs})` : abs;
}

export function ProfitLossView({
  data,
  onReload,
}: {
  data: PLData;
  onReload: (opts: { year: number; compare: boolean }) => void;
}) {
  const [mode, setMode] = useState<"standar" | "psak118">("psak118");
  const [year, setYear] = useState(data.year || new Date().getFullYear());
  const [compare, setCompare] = useState(data.compare !== false);
  const [refreshedAt] = useState(() =>
    new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  function exportCSV() {
    const lines = [
      ["Kode", "Nama Akun", ...(compare ? [String(year - 1)] : []), String(year)].join(","),
      ...data.revenues.map((r) => [r.code, `"${r.name}"`, ...(compare ? [r.previous] : []), r.current].join(",")),
      ...data.cogs.map((r) => [r.code, `"${r.name}"`, ...(compare ? [r.previous] : []), r.current].join(",")),
      ["", `"Laba Kotor"`, ...(compare ? [data.prevGrossProfit] : []), data.grossProfit].join(","),
      ...data.opExpenses.map((r) => [r.code, `"${r.name}"`, ...(compare ? [r.previous] : []), r.current].join(",")),
      ...data.otherExpenses.map((r) => [r.code, `"${r.name}"`, ...(compare ? [r.previous] : []), r.current].join(",")),
      ["", `"Laba (rugi) operasi"`, ...(compare ? [data.prevOperatingProfit] : []), data.operatingProfit].join(","),
      ...data.financingExpenses.map((r) => [r.code, `"${r.name}"`, ...(compare ? [r.previous] : []), r.current].join(",")),
      ["", `"Laba (rugi)"`, ...(compare ? [data.prevNetProfit] : []), data.netProfit].join(","),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laba-rugi-${mode}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const todayLabel = new Date().toLocaleDateString("id-ID");

  function renderAccountRows(rows: PLRow[]) {
    if (rows.length === 0) return null;
    return rows.map((r) => (
      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/70">
        <td className="py-2.5 px-6 text-slate-800 text-sm">
          <span className="text-slate-700">({r.code})</span> {r.name}
        </td>
        {compare && (
          <td className="py-2.5 px-5 text-right text-sm font-medium text-blue-600 tabular-nums">
            {fmtKledo(r.previous)}
          </td>
        )}
        <td className="py-2.5 px-5 text-right text-sm font-medium text-blue-600 tabular-nums">
          {fmtKledo(r.current)}
        </td>
      </tr>
    ));
  }

  function renderSummaryRow(label: string, prevVal: number, curVal: number, highlighted = false) {
    return (
      <tr className={highlighted ? "bg-slate-200/80 font-bold" : "border-b border-slate-100 font-bold"}>
        <td className="py-3 px-5 text-sm text-slate-900">{label}</td>
        {compare && (
          <td className="py-3 px-5 text-right text-sm text-slate-900 tabular-nums">
            {fmtKledo(prevVal)}
          </td>
        )}
        <td className="py-3 px-5 text-right text-sm text-slate-900 tabular-nums">
          {fmtKledo(curVal)}
        </td>
      </tr>
    );
  }

  function renderSectionBanner(title: string) {
    return (
      <tr className="bg-[#e8edf5]">
        <td colSpan={compare ? 3 : 2} className="py-2.5 px-5 text-sm font-bold text-slate-900">
          {title}
        </td>
      </tr>
    );
  }

  function renderSubHeader(title: string) {
    return (
      <tr className="border-b border-slate-100 bg-white">
        <td colSpan={compare ? 3 : 2} className="py-2.5 px-5 text-sm font-semibold text-slate-900">
          {title}
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Laba Rugi</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Share2 className="w-3.5 h-3.5" />
              Bagikan
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>

        {/* Mode Switcher + Filter + Compare */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setMode("standar")}
                className={`px-3.5 py-1.5 text-xs font-medium transition ${
                  mode === "standar"
                    ? "bg-blue-50 text-blue-600 border-r border-blue-400"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Standar
              </button>
              <button
                type="button"
                onClick={() => setMode("psak118")}
                className={`px-3.5 py-1.5 text-xs font-medium transition ${
                  mode === "psak118"
                    ? "bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-500"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                PSAK 118
              </button>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={compare ? "prev" : "none"}
              onChange={(e) => {
                const next = e.target.value === "prev";
                setCompare(next);
                onReload({ year, compare: next });
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 bg-white"
            >
              <option value="prev">Bandingkan: 1 tahun sebelumnya</option>
              <option value="none">Tanpa perbandingan</option>
            </select>
            <select
              value={year}
              onChange={(e) => {
                const y = Number(e.target.value);
                setYear(y);
                onReload({ year: y, compare });
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 bg-white"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden text-xs">
          <span className="px-3 py-1.5 text-slate-500 bg-slate-50">Data per {refreshedAt}</span>
          <button
            type="button"
            onClick={() => onReload({ year, compare })}
            className="px-3 py-1.5 bg-white text-slate-700 font-medium hover:bg-slate-50 inline-flex items-center gap-1.5 border-l border-slate-200"
          >
            <RefreshCw className="w-3 h-3" />
            Muat ulang
          </button>
        </div>

        {/* Report Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#e8edf5] border-b border-slate-200">
                <th className="py-3 px-5 text-left text-sm font-bold text-slate-900">Pendapatan</th>
                {compare && (
                  <th className="py-3 px-5 text-right text-sm font-bold text-slate-900 w-44">
                    {year - 1}
                  </th>
                )}
                <th className="py-3 px-5 text-right text-sm font-bold text-slate-900 w-44">
                  {year === new Date().getFullYear() ? todayLabel : year}
                </th>
              </tr>
            </thead>
            <tbody>
              {mode === "psak118" ? (
                <>
                  {renderSectionBanner("Operasi")}
                  {renderSubHeader("Penjualan")}
                  {renderAccountRows(data.revenues)}
                  {renderSubHeader("Beban Pokok Penjualan")}
                  {renderAccountRows(data.cogs)}
                  {renderSummaryRow("Laba Kotor", data.prevGrossProfit, data.grossProfit)}
                  {renderSubHeader("Biaya Operasional")}
                  {renderAccountRows(data.opExpenses)}
                  {renderSubHeader("Penghasilan operasi lainnya")}
                  {renderSubHeader("Beban operasi lainnya")}
                  {renderAccountRows(data.otherExpenses)}
                  {renderSummaryRow("Laba (rugi) operasi", data.prevOperatingProfit, data.operatingProfit)}
                  {renderSectionBanner("Investasi")}
                  {renderSummaryRow(
                    "Laba (rugi) sebelum pendanaan dan pajak penghasilan",
                    data.prevOperatingProfit,
                    data.operatingProfit
                  )}
                  {renderSectionBanner("Pendanaan")}
                  {renderAccountRows(data.financingExpenses)}
                  {renderSummaryRow(
                    "Laba (rugi) sebelum pajak penghasilan",
                    data.prevNetProfit,
                    data.netProfit
                  )}
                  {renderSectionBanner("Pajak penghasilan")}
                  {renderSummaryRow(
                    "Laba (rugi) dari operasi yang dilanjutkan",
                    data.prevNetProfit,
                    data.netProfit
                  )}
                  {renderSectionBanner("Operasi yang dihentikan")}
                  {renderSummaryRow("Laba (rugi)", data.prevNetProfit, data.netProfit, true)}
                </>
              ) : (
                <>
                  {renderSubHeader("Pendapatan")}
                  {renderAccountRows(data.revenues)}
                  {renderSubHeader("Harga Pokok Penjualan (HPP)")}
                  {renderAccountRows(data.cogs)}
                  {renderSummaryRow("Laba Kotor", data.prevGrossProfit, data.grossProfit)}
                  {renderSubHeader("Biaya Operasional")}
                  {renderAccountRows([...data.opExpenses, ...data.otherExpenses, ...data.financingExpenses])}
                  {renderSummaryRow("Laba / Rugi Bersih", data.prevNetProfit, data.netProfit, true)}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
