"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [withDemo, setWithDemo] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email, password }
          : { name, email, password, companyName, withDemo };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50">
      {/* Left Brand Showcase Panel */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative overflow-hidden bg-slate-950 text-white p-12 xl:p-16 flex-col justify-between">
        {/* Ambient gradient blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-teal-500/15 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-emerald-500/25">
            K
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">KASKU</div>
            <div className="text-xs text-slate-400">Cloud Accounting Platform</div>
          </div>
        </div>

        {/* Center Hero Content */}
        <div className="relative z-10 max-w-xl space-y-8 my-auto py-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-emerald-300 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Akuntansi Modern untuk Bisnis Berkembang</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.15] text-white">
              Kelola keuangan bisnis lebih{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                cerdas &amp; real-time.
              </span>
            </h1>
            <p className="text-base text-slate-400 leading-relaxed">
              Catat penjualan, pembelian, biaya operasional, hingga laporan laba rugi dan neraca
              otomatis dalam satu dashboard yang cepat dan akurat.
            </p>
          </div>

          {/* Feature Glass Cards */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-sm font-semibold text-white">Laba Rugi Instan</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                Pantau arus kas &amp; profitabilitas bisnis kapan saja.
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md space-y-2">
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-sm font-semibold text-white">Multi Perusahaan</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                Kelola banyak cabang atau entitas usaha dari satu akun.
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md space-y-2">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="text-sm font-semibold text-white">Jurnal Otomatis</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                Setiap faktur &amp; pembayaran langsung tercatat rapi.
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-sm font-semibold text-white">Aman &amp; Terenkripsi</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                Data keuangan tersimpan aman di cloud dengan kontrol penuh.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} KASKU. All rights reserved.</span>
          <span>Cloud Accounting Indonesia</span>
        </div>
      </div>

      {/* Right Auth Form Panel */}
      <div className="lg:col-span-6 xl:col-span-5 flex items-center justify-center p-6 sm:p-10 bg-white lg:bg-slate-50">
        <div className="w-full max-w-[420px] bg-white lg:rounded-3xl lg:shadow-xl lg:shadow-slate-200/60 lg:border lg:border-slate-200/80 p-2 sm:p-8 lg:p-9">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-emerald-500/20">
              K
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">KASKU</div>
              <div className="text-xs text-slate-500">Cloud Accounting Platform</div>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {mode === "login" ? "Selamat datang kembali" : "Buat akun baru"}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              {mode === "login"
                ? "Masuk untuk mengelola pembukuan perusahaan Anda."
                : "Mulai kelola keuangan bisnis Anda secara modern."}
            </p>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === "register"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Daftar Baru
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama lengkap Anda"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Usaha / Perusahaan
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Contoh: PT Maju Bersama"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <label className="flex items-center gap-2.5 text-xs text-slate-600 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={withDemo}
                  onChange={(e) => setWithDemo(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Sertakan data contoh awal untuk eksplorasi</span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
            >
              <span>
                {loading
                  ? "Memproses..."
                  : mode === "login"
                  ? "Masuk ke Dashboard"
                  : "Buat Akun Perusahaan"}
              </span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
