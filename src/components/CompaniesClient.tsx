"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, CheckCircle2, Plus, Trash2 } from "lucide-react";

interface CompanyItem {
  id: string;
  name: string;
  isDemo: boolean;
  createdAt: string;
  roleName: string;
}

export function CompaniesClient({
  initialCompanies,
  initialActiveId,
}: {
  initialCompanies: CompanyItem[];
  initialActiveId: string;
}) {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyItem[]>(initialCompanies);
  const [activeId, setActiveId] = useState(initialActiveId);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [withDemo, setWithDemo] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSwitch(companyId: string) {
    setError("");
    setBusyId(companyId);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", companyId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal berpindah perusahaan.");
        return;
      }
      setActiveId(companyId);
      router.push("/");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!newName.trim()) return;
    setBusyId("__create__");
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newName.trim(), withDemo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal membuat perusahaan.");
        return;
      }
      setCompanies((prev) => [
        ...prev,
        {
          id: data.company.id,
          name: data.company.name,
          isDemo: data.company.isDemo,
          createdAt: data.company.createdAt || new Date().toISOString(),
          roleName: "Owner",
        },
      ]);
      setActiveId(data.company.id);
      setNewName("");
      setWithDemo(false);
      setShowCreate(false);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(c: CompanyItem) {
    setError("");
    if (companies.length <= 1) {
      setError("Tidak dapat menghapus satu-satunya perusahaan. Buat perusahaan baru terlebih dahulu.");
      return;
    }
    const ok = confirm(
      `Hapus perusahaan "${c.name}" beserta seluruh data transaksi, akun, kontak, dan produknya secara permanen?`
    );
    if (!ok) return;

    setBusyId(c.id);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", companyId: c.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menghapus perusahaan.");
        return;
      }
      setCompanies((prev) => prev.filter((item) => item.id !== c.id));
      if (data.activeCompanyId) setActiveId(data.activeCompanyId);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daftar Perusahaan</h1>
          <p className="text-sm text-slate-500">
            Pilih, tambah, atau hapus perusahaan yang terhubung dengan akun Anda.
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition"
        >
          ← Kembali
        </Link>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.map((c) => {
            const isActive = c.id === activeId;
            return (
              <div
                key={c.id}
                className={`relative rounded-xl border p-6 flex flex-col items-center text-center justify-between transition ${
                  isActive
                    ? "bg-emerald-50/70 border-emerald-200 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                {companies.length > 1 && (
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => handleDelete(c)}
                    title="Hapus Perusahaan"
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div
                  onClick={() => !isActive && handleSwitch(c.id)}
                  className={`w-full space-y-2 ${!isActive ? "cursor-pointer" : ""}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="pt-1">
                    <div className="font-bold text-slate-900 text-base flex items-center justify-center gap-1.5">
                      <span>{c.name}</span>
                      {isActive && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Dibuat{" "}
                      {new Date(c.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-slate-500">
                      Sebagai <span className="font-semibold text-slate-700">{c.roleName}</span>
                    </div>
                  </div>
                </div>

                <div className="w-full pt-4 mt-4 border-t border-slate-200/70 flex items-center justify-center gap-2">
                  {isActive ? (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                      Perusahaan Aktif
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => handleSwitch(c.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-50"
                    >
                      {busyId === c.id ? "Membuka..." : "Buka Perusahaan"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setError("");
              setShowCreate(true);
            }}
            className="rounded-xl border border-dashed border-slate-300 p-6 min-h-[190px] flex flex-col items-center justify-center gap-2 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition"
          >
            <Plus className="w-8 h-8 text-slate-400" />
            <span className="text-sm font-semibold">Tambah Perusahaan</span>
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Tambah Perusahaan Baru</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Perusahaan
                </label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Ayam Geprek Cabang 2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={withDemo}
                  onChange={(e) => setWithDemo(e.target.checked)}
                />
                <span>Isi dengan data contoh (demo)</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busyId === "__create__"}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {busyId === "__create__" ? "Menyimpan..." : "Buat Perusahaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
