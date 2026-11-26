"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ReportShell,
  PenjualanPerPelangganTable,
} from "@/components/ReportTables";

export function PenjualanPerPelangganClient() {
  const now = new Date();
  const year = now.getFullYear();
  const [startDate, setStartDate] = useState(`${year}-01-01`);
  const [endDate, setEndDate] = useState(`${year}-12-31`);
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchData = useCallback(async (sd: string, ed: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (sd) qs.set("startDate", sd);
      if (ed) qs.set("endDate", ed);
      const res = await fetch(`/api/reports/penjualan-per-pelanggan?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows);
        setLastUpdated(
          new Date().toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(startDate, endDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ReportShell
      title="Penjualan per Pelanggan"
      defaultStartDate={startDate}
      defaultEndDate={endDate}
      onDateChange={(sd, ed) => {
        setStartDate(sd);
        setEndDate(ed);
        fetchData(sd, ed);
      }}
    >
      {lastUpdated && (
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            🕐 Data per {lastUpdated} · Baru saja diperbarui
          </span>
          <button
            onClick={() => fetchData(startDate, endDate)}
            className="text-slate-500 hover:text-slate-700"
          >
            ↻ Muat ulang
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">
          Memuat laporan...
        </div>
      ) : (
        <PenjualanPerPelangganTable rows={rows as never[]} />
      )}
    </ReportShell>
  );
}
