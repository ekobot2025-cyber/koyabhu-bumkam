import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle, Egg, Sparkles, TrendingUp, ShieldCheck, CheckCircle2, MapPin, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Gagal masuk. Periksa kembali username dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f1f9f5] via-[#f7fbf7] to-[#edf6ea] font-['Plus_Jakarta_Sans',sans-serif] flex flex-col justify-between selection:bg-[#55a938]/20 selection:text-[#18321c]">
      {/* Top Header / Brand Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white shadow-sm border border-emerald-100 flex items-center justify-center">
              <img
                src="/logo.svg"
                alt="Logo KOYABHU"
                className="w-9 h-9 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-[#18321c]">
                  KOYABHU
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#edf6d7] text-[#2c5b20] font-extrabold border border-[#d6ebbb]">
                  BUMKam
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Kampung Koyabhu • Distrik Sentani Timur • Jayapura, Papua
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-emerald-100/80 shadow-xs text-xs font-semibold text-[#18321c]">
            <span className="w-2 h-2 rounded-full bg-[#55a938] animate-pulse" />
            <span>Sistem Informasi Manajemen Peternakan</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full items-stretch">
          
          {/* Left Side: Bright Chicken Farm Illustration Showcase */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-xl shadow-emerald-950/5 flex-1 min-h-[480px] lg:min-h-[580px] flex flex-col justify-between p-6 sm:p-8 bg-emerald-50">
              
              {/* Full Bright Chicken Farm Image - completely unblocked, bright & vivid */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out hover:scale-105"
                style={{ backgroundImage: "url('/chicken_farm_bg.jpg')" }}
              />

              {/* Gentle daylight gradient vignette for text legibility without dimming the photo */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-transparent to-white/40 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-transparent pointer-events-none" />

              {/* Top Glass Tags on Image */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/80 shadow-sm text-xs font-bold text-[#18321c]">
                  <Egg className="w-4 h-4 text-[#55a938]" />
                  <span>Kandang Layer Produktif Sentani</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white/80 shadow-sm text-[11px] font-semibold text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-[#55a938]" />
                  <span>Sentani Timur, Jayapura</span>
                </div>
              </div>

              {/* Floating Stat Pills on the Photo (Dikta Health Hero style) */}
              <div className="relative z-10 my-auto py-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md pointer-events-none">
                <div className="p-3.5 rounded-2xl bg-white/90 backdrop-blur-md border border-white/90 shadow-md flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#edf6d7] border border-[#d6ebbb] flex items-center justify-center shrink-0">
                    <Egg className="w-5 h-5 text-[#55a938]" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-[#18321c] leading-tight">1.000 Butir</div>
                    <div className="text-[11px] text-slate-600 font-semibold">Produksi Telur / Hari</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/90 backdrop-blur-md border border-white/90 shadow-md flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#e7f6ff] border border-sky-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-[#18321c] leading-tight">1.200+ Ekor</div>
                    <div className="text-[11px] text-slate-600 font-semibold">Ayam Layer Produktif</div>
                  </div>
                </div>
              </div>

              {/* Bottom Glassmorphism Showcase Card */}
              <div className="relative z-10 bg-white/92 backdrop-blur-md border border-white/95 rounded-2xl p-5 sm:p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#edf6d7] text-[#2c5b20] text-[10px] font-black uppercase tracking-wider border border-[#d6ebbb]">
                    Input Sekali • Terintegrasi Penuh
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#fff8db] text-[#b45309] text-[10px] font-bold border border-[#fed7aa]">
                    Transparan & Akuntabel
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-[#18321c] tracking-tight leading-snug mb-2">
                  Pengelolaan Usaha Peternakan Ayam Petelur & Kas Terpadu
                </h2>
                
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  Mulai dari pencatatan aktivitas kandang, panen telur harian, penjualan per rak, otomatisasi pembukuan buku kas tunai, hingga penyusunan laporan hasil usaha BUMKam.
                </p>

                {/* Bottom Feature Badges */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div className="py-1 px-2 rounded-xl bg-slate-50 text-[11px] font-bold text-slate-700">
                    🐔 Recording Kandang
                  </div>
                  <div className="py-1 px-2 rounded-xl bg-slate-50 text-[11px] font-bold text-slate-700">
                    🛒 Penjualan Telur
                  </div>
                  <div className="py-1 px-2 rounded-xl bg-slate-50 text-[11px] font-bold text-slate-700">
                    📑 Laporan Usaha
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Side: Bright Modern Login Card (Dikta Health Hero Style) */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-emerald-100/80 p-6 sm:p-8 lg:p-10 shadow-xl shadow-emerald-950/5">
              
              {/* Card Header */}
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-[#edf6d7] border border-[#d6ebbb] mb-3 shadow-xs">
                  <img src="/logo.svg" alt="KOYABHU" className="w-11 h-11 mx-auto" />
                </div>
                <h2 className="text-2xl font-black text-[#18321c] tracking-tight">
                  Masuk ke Akun Anda
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Sistem Informasi Manajemen BUMKam KOYABHU
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed font-medium">{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username Anda"
                      className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50/80 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#55a938] focus:border-[#55a938] transition-all font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kata Sandi (Password)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi Anda"
                      className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50/80 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#55a938] focus:border-[#55a938] transition-all font-medium text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Action Button with Dikta Green */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-[#55a938] hover:bg-[#46902e] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#55a938]/30 hover:shadow-xl hover:shadow-[#55a938]/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2 active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <span>Masuk Sekarang</span>
                  )}
                </button>
              </form>

              {/* Quick Account Switcher (Dikta styled 3-role pills) */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 text-center">
                  Pilih Akun Hak Akses (3 Role):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin', 'admin123')}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      username === 'admin'
                        ? 'bg-[#edf6d7] border-[#7ebd58] text-[#18321c] shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[11px]">Ketua</span>
                      {username === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-[#55a938]" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">Akses Penuh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('kandang', 'kandang123')}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      username === 'kandang' || username === 'petugas'
                        ? 'bg-[#edf6d7] border-[#7ebd58] text-[#18321c] shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[11px]">Kandang</span>
                      {(username === 'kandang' || username === 'petugas') && <CheckCircle2 className="w-3.5 h-3.5 text-[#55a938]" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">Recording Saja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('penjualan', 'penjualan123')}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      username === 'penjualan'
                        ? 'bg-[#edf6d7] border-[#7ebd58] text-[#18321c] shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[11px]">Penjualan</span>
                      {username === 'penjualan' && <CheckCircle2 className="w-3.5 h-3.5 text-[#55a938]" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">Jual Telur Saja</span>
                  </button>
                </div>
              </div>

              {/* Security Footnote */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#55a938]" />
                <span>Terotentikasi Aman • Sesuai Hak Akses Pengguna</span>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Official Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-center text-xs text-slate-500 font-medium border-t border-emerald-100/60 mt-4">
        © 2026 BUMKAM KOYABHU • Kelompok 3 Kelas B • Teknologi Digital Akuntansi • S1 Akuntansi FEB Uncen • All rights reserved.
      </footer>
    </div>
  );
}
