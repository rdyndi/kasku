"use client";

import { useState } from "react";
import { Plus, Pencil, Search, Trash2, Tag } from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";

interface Category {
  id: string;
  name: string;
}

interface AccountOpt {
  id: string;
  code: string;
  name: string;
  category: string;
}

interface ProductItem {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  type: string;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  isPurchased: boolean;
  isSold: boolean;
  trackInventory: boolean;
  purchaseAccountId?: string | null;
  salesAccountId?: string | null;
  categoryId: string | null;
  category: Category | null;
}

const money = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);

const TYPE_LABELS: Record<string, string> = {
  goods: "Barang",
  service: "Jasa",
  bundle: "Paket",
};

const DEFAULT_UNITS = ["Pcs", "Kg", "LITER", "Pack", "Galon", "Box", "Lusin", "Gram", "Botol"];

export function ProductsClient({
  initialProducts,
  initialCategories,
  accounts = [],
}: {
  initialProducts: ProductItem[];
  initialCategories: Category[];
  accounts?: AccountOpt[];
}) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Form fields
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("goods");
  const [unit, setUnit] = useState("Pcs");
  const [units, setUnits] = useState<string[]>(() => {
    const existing = initialProducts.map((p) => p.unit).filter(Boolean);
    return Array.from(new Set([...DEFAULT_UNITS, ...existing]));
  });
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [buyPrice, setBuyPrice] = useState("0");
  const [sellPrice, setSellPrice] = useState("0");
  const [isPurchased, setIsPurchased] = useState(true);
  const [isSold, setIsSold] = useState(true);
  const [purchaseAccountId, setPurchaseAccountId] = useState("");
  const [salesAccountId, setSalesAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [trackInventory, setTrackInventory] = useState(true);
  const [newCatName, setNewCatName] = useState("");

  async function refresh() {
    const [pRes, cRes] = await Promise.all([fetch("/api/products"), fetch("/api/product-categories")]);
    if (pRes.ok) {
      const d = await pRes.json();
      setProducts(d.products);
    }
    if (cRes.ok) {
      const d = await cRes.json();
      setCategories(d.categories);
    }
  }

  function openCreate() {
    setEditId(null);
    setSku("");
    setBarcode("");
    setName("");
    setType("goods");
    setUnit("Pcs");
    setAddingUnit(false);
    setBuyPrice("0");
    setSellPrice("0");
    setIsPurchased(true);
    setIsSold(true);
    setPurchaseAccountId("");
    setSalesAccountId("");
    setCategoryId("");
    setTrackInventory(true);
    setError("");
    setShowModal(true);
  }

  function openEdit(p: ProductItem) {
    setEditId(p.id);
    setSku(p.sku);
    setBarcode(p.barcode || "");
    setName(p.name);
    setType(p.type);
    setUnit(p.unit);
    setBuyPrice(String(p.buyPrice));
    setSellPrice(String(p.sellPrice));
    setIsPurchased(p.isPurchased);
    setIsSold(p.isSold);
    setPurchaseAccountId(p.purchaseAccountId || "");
    setSalesAccountId(p.salesAccountId || "");
    setCategoryId(p.categoryId || "");
    setTrackInventory(p.trackInventory);
    setError("");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isPurchased && !isSold) {
      setError("Pilih minimal satu: Saya membeli item ini atau Saya menjual item ini.");
      return;
    }
    const payload = {
      sku,
      barcode: barcode || null,
      name,
      type,
      unit,
      buyPrice: isPurchased ? Number(buyPrice) || 0 : 0,
      sellPrice: isSold ? Number(sellPrice) || 0 : 0,
      isPurchased,
      isSold,
      purchaseAccountId: isPurchased ? purchaseAccountId || null : null,
      salesAccountId: isSold ? salesAccountId || null : null,
      categoryId: categoryId || null,
      trackInventory: type === "service" ? false : trackInventory,
    };

    const res = await fetch(editId ? `/api/products/${editId}` : "/api/products", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan produk.");
      return;
    }
    setShowModal(false);
    await refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus produk ini?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Gagal menghapus produk.");
      return;
    }
    await refresh();
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const res = await fetch("/api/product-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName }),
    });
    if (res.ok) {
      setNewCatName("");
      setShowCatModal(false);
      await refresh();
    }
  }

  const filtered = products.filter((p) => {
    const matchCat = filterCat === "all" || p.categoryId === filterCat;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  return (
    <div>
      {/* Mobile View */}
      <div className="block lg:hidden space-y-3 pb-20">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk, SKU, barcode..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCatModal(true)}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 shadow-xs"
            aria-label="Kelola Kategori"
          >
            <Tag className="w-5 h-5" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterCat("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              filterCat === "all"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            Semua ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilterCat(c.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                filterCat === c.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Mobile Product Cards */}
        <div className="space-y-2.5">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{p.name}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {p.sku} · {p.category?.name || "Tanpa Kategori"} · {p.unit}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    aria-label="Edit produk"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    aria-label="Hapus produk"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Harga Beli</span>
                  <span className="font-semibold text-slate-700">
                    {p.isPurchased ? money(p.buyPrice) : "—"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Harga Jual</span>
                  <span className="font-bold text-blue-600">
                    {p.isSold ? money(p.sellPrice) : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
              Belum ada produk.
            </div>
          )}
        </div>

        {/* Mobile FAB */}
        <button
          type="button"
          onClick={openCreate}
          aria-label="Tambah Produk"
          className="fixed bottom-6 right-5 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center z-30 active:scale-95 transition"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produk</h1>
          <p className="text-sm text-slate-500">
            Kelola daftar barang dagang, jasa, harga beli/jual, dan kategori produk.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCatModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            <Tag className="w-4 h-4" />
            Kategori
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase">Total Produk</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{products.length}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase">Barang (Lacak Stok)</div>
          <div className="mt-1 text-xl font-bold text-blue-600">
            {products.filter((p) => p.trackInventory).length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase">Jasa / Non-Stok</div>
          <div className="mt-1 text-xl font-bold text-emerald-600">
            {products.filter((p) => !p.trackInventory).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama produk, SKU, atau barcode..."
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white w-72"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="all">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Nama Produk</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Satuan</th>
              <th className="px-4 py-3 text-right">Harga Beli</th>
              <th className="px-4 py-3 text-right">Harga Jual</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.sku}</td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {p.name}
                  {p.trackInventory && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Stok
                    </span>
                  )}
                  {p.isPurchased && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      Beli
                    </span>
                  )}
                  {p.isSold && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      Jual
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[p.type] || p.type}</td>
                <td className="px-4 py-3 text-slate-600">{p.category?.name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{p.unit}</td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {p.isPurchased ? money(p.buyPrice) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {p.isSold ? money(p.sellPrice) : "—"}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-slate-400 hover:text-blue-600 p-1"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-slate-400 hover:text-red-600 p-1"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  Belum ada produk. Klik &ldquo;Tambah Produk&rdquo; untuk memulai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>

      {/* Modal Tambah/Edit Produk */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {editId ? "Edit Produk" : "Tambah Produk Baru"}
            </h2>
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>}
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">SKU / Kode</label>
                  <input
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="PRD-001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Barcode (Opsional)</label>
                  <input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="899..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Produk</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kopi Arabika 250gr"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipe</label>
                  <select
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value);
                      if (e.target.value === "service") setTrackInventory(false);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="goods">Barang</option>
                    <option value="service">Jasa</option>
                    <option value="bundle">Paket</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    <span className="text-red-500">*</span> Satuan
                  </label>
                  {addingUnit ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                        placeholder="Satuan baru"
                        className="w-full px-2 py-2 border border-blue-400 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const v = newUnitName.trim();
                          if (v) {
                            setUnits((prev) => Array.from(new Set([...prev, v])));
                            setUnit(v);
                          }
                          setNewUnitName("");
                          setAddingUnit(false);
                        }}
                        className="px-2.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <select
                      value={unit}
                      onChange={(e) => {
                        if (e.target.value === "__add__") {
                          setAddingUnit(true);
                        } else {
                          setUnit(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      {units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      <option value="__add__">+ Tambah Satuan</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">— Tanpa Kategori —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100">
                {/* Saya membeli item ini */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsPurchased((v) => !v)}
                    className="flex items-center gap-3 text-sm font-medium text-slate-800"
                  >
                    <span
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors flex items-center ${
                        isPurchased ? "bg-blue-600 justify-end" : "bg-slate-300 justify-start"
                      }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                    </span>
                    <span>Saya membeli item ini</span>
                  </button>
                  {isPurchased && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Harga Beli</label>
                        <CurrencyInput
                          value={buyPrice}
                          onValueChange={setBuyPrice}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Akun Pembelian</label>
                        <select
                          value={purchaseAccountId}
                          onChange={(e) => setPurchaseAccountId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                          <option value="">Default (Persediaan Barang)</option>
                          {accounts
                            .filter((a) => ["cogs", "expense", "asset"].includes(a.category))
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} {a.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Saya menjual item ini */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSold((v) => !v)}
                    className="flex items-center gap-3 text-sm font-medium text-slate-800"
                  >
                    <span
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors flex items-center ${
                        isSold ? "bg-blue-600 justify-end" : "bg-slate-300 justify-start"
                      }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                    </span>
                    <span>Saya menjual item ini</span>
                  </button>
                  {isSold && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Harga Jual</label>
                        <CurrencyInput
                          value={sellPrice}
                          onValueChange={setSellPrice}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Akun Penjualan</label>
                        <select
                          value={salesAccountId}
                          onChange={(e) => setSalesAccountId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                          <option value="">Default (Pendapatan Penjualan)</option>
                          {accounts
                            .filter((a) => a.category === "revenue")
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} {a.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {type !== "service" && (
                <label className="flex items-center gap-2 text-sm text-slate-700 pt-1">
                  <input
                    type="checkbox"
                    checked={trackInventory}
                    onChange={(e) => setTrackInventory(e.target.checked)}
                  />
                  <span>Lacak persediaan stok & hitung HPP otomatis</span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Kategori */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Kategori Produk</h2>
            <ul className="divide-y divide-slate-100 text-sm max-h-40 overflow-y-auto">
              {categories.map((c) => (
                <li key={c.id} className="py-2 text-slate-700">
                  {c.name}
                </li>
              ))}
              {categories.length === 0 && <li className="py-2 text-slate-400">Belum ada kategori.</li>}
            </ul>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nama kategori baru"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Tambah
              </button>
            </form>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                className="text-xs text-slate-500 hover:underline"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
