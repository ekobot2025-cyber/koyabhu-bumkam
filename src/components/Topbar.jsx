import React, { useState, useEffect } from 'react';
import { Menu, Bell, User, LogOut, ChevronDown, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Topbar({ onMenuClick, activeTab, setActiveTab }) {
  const { user, logout, isAdmin } = useAuth();
  const [currentTime, setCurrentTime] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Realtime clock in Asia/Jayapura
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jayapura',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const dateStr = now.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jayapura',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      setCurrentTime(`${dateStr} • ${timeStr} WIT`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch operational alerts for topbar bell (Admin only)
  useEffect(() => {
    async function fetchAlerts() {
      if (!isAdmin) {
        setAlerts([]);
        return;
      }
      try {
        const res = await api.get('/dashboard?period=today');
        if (res.alerts) {
          setAlerts(res.alerts);
        }
      } catch {
        // Silent catch for alerts preview
      }
    }
    fetchAlerts();
    if (isAdmin) {
      const interval = setInterval(fetchAlerts, 60000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const titles = {
    dashboard: 'Beranda / Ringkasan Usaha',
    sales: 'Penjualan Telur',
    recording: 'Recording Ayam & Produksi Telur',
    cashbook: 'Buku Kas & Arus Kas',
    income: 'Pemasukan Lainnya',
    expenses: 'Pengeluaran Operasional',
    reports: 'Pusat Laporan Usaha & Hasil Usaha',
    settings: 'Pengaturan Akun & BUMKam'
  };

  const handleAlertClick = (link) => {
    setShowAlertDropdown(false);
    if (link === '/recordings') setActiveTab('recording');
    else if (link === '/sales') setActiveTab('sales');
    else if (link === '/cashbook') setActiveTab('cashbook');
    else if (link === '/reports') setActiveTab('reports');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-emerald-100/80 px-4 lg:px-8 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-lg font-extrabold text-[#18321c] leading-tight">
            {titles[activeTab] || 'KOYABHU BUMKam'}
          </h2>
          <span className="hidden sm:block text-xs text-slate-500 font-medium">
            BUMKam KOYABHU • Sentani Timur, Jayapura
          </span>
        </div>
      </div>

      {/* Right: Clock, Alerts, Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Time display */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#edf6d7] border border-[#d6ebbb] rounded-full text-xs font-bold text-[#18321c]">
          <span className="w-2 h-2 rounded-full bg-[#55a938]" />
          <span>{currentTime}</span>
        </div>

        {/* Operational Alerts Bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlertDropdown(!showAlertDropdown)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
            title="Peringatan Operasional"
          >
            <Bell className="w-5 h-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {alerts.length}
              </span>
            )}
          </button>

          {/* Alerts Dropdown */}
          {showAlertDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-800">
                  Peringatan Operasional
                </span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-medium">
                  {alerts.length} Perhatian
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {alerts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                    Semua operasional peternakan dan kas dalam kondisi normal.
                  </div>
                ) : (
                  alerts.map((al, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleAlertClick(al.link)}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex gap-3 items-start transition-colors"
                    >
                      {al.type === 'danger' && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                      {al.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                      {al.type === 'info' && <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                      <div className="text-xs">
                        <div className="font-semibold text-slate-800">{al.title}</div>
                        <div className="text-slate-600 mt-0.5 leading-relaxed">{al.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 text-left transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#55a938] text-white font-black text-xs flex items-center justify-center shadow-xs">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {user?.name || 'Pengguna'}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {user?.role === 'ADMIN'
                  ? 'Ketua BUMKam'
                  : user?.role === 'PETUGAS_PENJUALAN'
                  ? 'Petugas Penjualan'
                  : 'Petugas Kandang'}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="font-semibold text-sm text-slate-800">{user?.name}</div>
                <div className="text-xs text-slate-500">{user?.username} ({user?.role})</div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    setActiveTab('settings');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Profil & Keamanan</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Keluar (Logout)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
