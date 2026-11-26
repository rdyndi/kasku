"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ReportShell,
  PembelianPerVendorTable,
} from "@/components/ReportTables";

export function PembelianPerVendorClient() {
  const now = new Date();
  const year = now.getFullYear();
  const [startDate, setStartDate] = useState(`${year}-01-01`);
  const [endDate, setEndDate] = useState(
    `${year}-12-31`
  );
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchData = useCallback(
    async (sd: string, ed: string) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (sd) qs.set("startDate", sd);
        if (ed) qs.set("endDate", ed);
        const res = await fetch(`/api/reports/pembelian-per-vendor?${qs.toString()}`);
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
    },
    []
  );

  useEffect(() => {
    const qs = new URLSearchParams();
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    fetch(`/api/reports/pembelian-per-vendor?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
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
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ReportShell
      title="Pembelian per Vendor"
      defaultStartDate={startDate}
      defaultEndDate={endDate}
      onDateChange={(sd, ed) => {
        setStartDate(sd);
        setEndDate(ed);
        fetchData(sd, ed);
      }}
    >
      {/* Info bar */}
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
        <PembelianPerVendorTable rows={rows as never[]} />
      )}
    </ReportShell>
  );
}
