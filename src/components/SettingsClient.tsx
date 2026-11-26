"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CompanyInfo {
  name: string;
  npwp: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lockDate: string | null;
  numberSequences: Array<{ docType: string; prefix: string; nextNumber: number }>;
  taxes: Array<{ id: string; name: string; rate: number; type: string }>;
  paymentTerms: Array<{ id: string; name: string; days: number }>;
  accountMappings: Array<{ mappingKey: string; account: { code: string; name: string } }>;
}

export function SettingsClient({ company }: { company: CompanyInfo }) {
  const router = useRouter();
  const [name, setName] = useState(company.name);
  const [npwp, setNpwp] = useState(company.npwp || "");
  const [phone, setPhone] = useState(company.phone || "");
  const [email, setEmail] = useState(company.email || "");
  const [address, setAddress] = useState(company.address || "");
  const [lockDate, setLockDate] = useState(
    company.lockDate ? company.lockDate.slice(0, 10) : ""
  );
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const res = await fetch("/api/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        npwp,
        phone,
        email,
        address,
        lockDate: lockDate || null,
      }),
    });
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Perusahaan</h1>
        <p className="text-sm text-slate-500">
          Profil perusahaan, tanggal penguncian periode, pajak, termin, dan penomoran otomatis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
        >
          <h2 className="font-semibold text-slate-900">Profil & Penguncian Periode</h2>
          {saved && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
              Pengaturan perusahaan berhasil disimpan.
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nama Perusahaan
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">NPWP</label>
              <input
                value={npwp}
                onChange={(e) => setNpwp(e.target.value)}
                placeholder="00.000.000.0-000.000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Telepon</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Alamat</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Tanggal Penguncian (Lock Date)
            </label>
            <input
              type="date"
              value={lockDate}
              onChange={(e) => setLockDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Transaksi pada atau sebelum tanggal ini tidak dapat diposting.
            </p>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Simpan Pengaturan
          </button>
        </form>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-3">Penomoran Otomatis</h2>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {company.numberSequences.map((s) => (
                <div
                  key={s.docType}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="font-semibold text-slate-700">{s.docType}</div>
                  <div className="font-mono text-slate-500">
                    {s.prefix}
                    {String(s.nextNumber).padStart(4, "0")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-3">Mapping Akun Default</h2>
            <div className="space-y-2 text-xs">
              {company.accountMappings.map((m) => (
                <div
                  key={m.mappingKey}
                  className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                >
                  <span className="font-mono text-slate-500">{m.mappingKey}</span>
                  <span className="font-medium text-slate-800">
                    {m.account.code} — {m.account.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-2 gap-4 text-xs">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Termin Pembayaran</h3>
              <ul className="space-y-1 text-slate-600">
                {company.paymentTerms.map((t) => (
                  <li key={t.id}>
                    {t.name} ({t.days} hari)
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Tarif Pajak</h3>
              <ul className="space-y-1 text-slate-600">
                {company.taxes.map((t) => (
                  <li key={t.id}>
                    {t.name} ({t.rate}%)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
