"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2, User, X } from "lucide-react";

interface ContactItem {
  id: string;
  type: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  npwp: string | null;
  address: string | null;
}

const CONTACT_TYPES = [
  { key: "vendor", label: "Vendor", pillClass: "bg-rose-500 text-white", rowBg: "bg-rose-500 text-white" },
  { key: "employee", label: "Pegawai", pillClass: "bg-teal-500 text-white", rowBg: "bg-teal-500 text-white" },
  { key: "customer", label: "Pelanggan", pillClass: "bg-blue-500 text-white", rowBg: "bg-blue-500 text-white" },
  { key: "investor", label: "Investor", pillClass: "bg-slate-900 text-white", rowBg: "bg-slate-900 text-white" },
  { key: "other", label: "Lainnya", pillClass: "bg-purple-800 text-white", rowBg: "bg-purple-800 text-white" },
] as const;

function parseTypes(typeStr: string): string[] {
  return String(typeStr || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getTypeMeta(key: string) {
  return (
    CONTACT_TYPES.find((t) => t.key === key) || {
      key,
      label: key,
      pillClass: "bg-slate-600 text-white",
      rowBg: "bg-slate-600 text-white",
    }
  );
}

export function ContactsClient({ initialContacts }: { initialContacts: ContactItem[] }) {
  const [contacts, setContacts] = useState<ContactItem[]>(initialContacts);
  const [filterType, setFilterType] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAddressSection, setShowAddressSection] = useState(true);
  const [error, setError] = useState("");

  // Form fields (tanpa Fax)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["customer"]);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [email, setEmail] = useState("");
  const [npwp, setNpwp] = useState("");
  const [address, setAddress] = useState("");

  async function refresh() {
    const res = await fetch("/api/contacts");
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts);
    }
  }

  function openCreate() {
    setEditId(null);
    setSelectedTypes(["customer"]);
    setName("");
    setCompanyName("");
    setPhone("");
    setSecondaryPhone("");
    setEmail("");
    setNpwp("");
    setAddress("");
    setDropdownOpen(false);
    setShowAddressSection(true);
    setError("");
    setShowModal(true);
  }

  function openEdit(c: ContactItem) {
    setEditId(c.id);
    setSelectedTypes(parseTypes(c.type));
    setName(c.name);
    setCompanyName(c.companyName || "");
    const parts = (c.phone || "").split(" / ");
    setPhone(parts[0] || "");
    setSecondaryPhone(parts[1] || "");
    setEmail(c.email || "");
    setNpwp(c.npwp || "");
    setAddress(c.address || "");
    setDropdownOpen(false);
    setShowAddressSection(true);
    setError("");
    setShowModal(true);
  }

  function toggleType(key: string) {
    setSelectedTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (selectedTypes.length === 0) {
      setError("Pilih minimal satu tipe kontak.");
      return;
    }

    const res = await fetch(editId ? `/api/contacts/${editId}` : "/api/contacts", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        types: selectedTypes,
        name,
        companyName,
        phone,
        secondaryPhone,
        email,
        npwp,
        address,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan kontak.");
      return;
    }
    setShowModal(false);
    await refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus kontak ini?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) await refresh();
  }

  const filtered =
    filterType === "all"
      ? contacts
      : contacts.filter((c) => parseTypes(c.type).includes(filterType));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kontak</h1>
          <p className="text-sm text-slate-500">
            Data pelanggan, vendor, pegawai, investor, dan relasi bisnis lainnya (bisa lebih dari satu tipe).
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tambah Kontak
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${
            filterType === "all"
              ? "bg-slate-900 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Semua ({contacts.length})
        </button>
        {CONTACT_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilterType(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              filterType === t.key
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Tipe Kontak</th>
              <th className="px-4 py-3">Perusahaan</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Telepon</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((c) => {
              const types = parseTypes(c.type);
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {types.map((tKey) => {
                        const meta = getTypeMeta(tKey);
                        return (
                          <span
                            key={tKey}
                            className={`text-[11px] px-2 py-0.5 rounded font-medium ${meta.pillClass}`}
                          >
                            {meta.label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.companyName || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-slate-400 hover:text-blue-600 p-1"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Belum ada kontak pada kategori ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah / Edit Kontak (Gaya Kledo, tanpa Fax) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">
              {editId ? "Edit Kontak" : "Tambah Kontak"}
            </h2>
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Profil Kontak */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 pb-2 border-b border-slate-100">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Profil Kontak</span>
                </div>

                {/* Multi-select Tipe Kontak */}
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    <span className="text-red-500">*</span> Tipe Kontak
                  </label>
                  <div
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="min-h-[42px] px-2.5 py-1.5 border border-blue-500 rounded-lg flex flex-wrap items-center gap-1.5 cursor-pointer bg-white focus-within:ring-2 focus-within:ring-blue-200"
                  >
                    {selectedTypes.length === 0 && (
                      <span className="text-sm text-slate-400 px-1">Pilih tipe kontak...</span>
                    )}
                    {selectedTypes.map((key) => {
                      const meta = getTypeMeta(key);
                      return (
                        <span
                          key={key}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md ${meta.pillClass}`}
                        >
                          {meta.label}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleType(key);
                            }}
                            className="hover:opacity-80"
                            aria-label={`Hapus ${meta.label}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                    {selectedTypes.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTypes([]);
                        }}
                        className="ml-auto text-slate-400 hover:text-slate-600 p-0.5"
                        title="Hapus semua"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {dropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-lg border border-slate-200 z-20">
                      {CONTACT_TYPES.map((t) => {
                        const checked = selectedTypes.includes(t.key);
                        return (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => toggleType(t.key)}
                            className={`w-full px-4 py-2.5 flex items-center justify-between text-sm font-medium transition ${
                              checked
                                ? t.rowBg
                                : "bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span>{t.label}</span>
                            {checked && <Check className="w-4 h-4" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      <span className="text-red-500">*</span> Nama
                    </label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama kontak"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Perusahaan
                    </label>
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Perusahaan"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Telepon</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Telepon"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Telepon sekunder
                    </label>
                    <input
                      value={secondaryPhone}
                      onChange={(e) => setSecondaryPhone(e.target.value)}
                      placeholder="Telepon sekunder"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">NPWP (Opsional)</label>
                    <input
                      value={npwp}
                      onChange={(e) => setNpwp(e.target.value)}
                      placeholder="00.000.000.0-000.000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Alamat Penagihan */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAddressSection((s) => !s)}
                  className="w-full px-4 py-3 bg-slate-50 flex items-center gap-2 text-sm font-semibold text-slate-800 text-left"
                >
                  {showAddressSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span>Alamat Penagihan</span>
                </button>
                {showAddressSection && (
                  <div className="p-4">
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      placeholder="Alamat lengkap penagihan / pengiriman"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  {editId ? "Simpan Perubahan" : "+ Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
