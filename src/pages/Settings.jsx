import React, { useState, useEffect } from 'react';
import {
  Building,
  User,
  Lock,
  Database,
  History,
  Save,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { formatRupiah, formatDateTimeWIT } from '../utils/formatters';

export default function Settings() {
  const { user, updateUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Business Profile Form State
  const [bumkamProfile, setBumkamProfile] = useState({
    name: 'BUMKam KOYABHU',
    unit_name: 'Unit Usaha Peternakan Ayam Petelur',
    address: 'Jl. Poros Koyabhu',
    kampung: 'Koyabhu',
    distrik: 'Sentani Timur',
    kabupaten: 'Kabupaten Jayapura',
    provinsi: 'Papua',
    phone: '0812-3456-7890',
    email: 'koyabhu.bumkam@gmail.com',
    logo_url: '/logo.svg',
    initial_balance: 0
  });

  // 2. User Profile Form State
  const [userProfile, setUserProfile] = useState({
    name: user?.name || '',
    jabatan: user?.jabatan || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  // 3. Password Form State
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 4. Audit Trail State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);

  // 5. Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    isDanger: true
  });

  // Fetch initial profile
  const fetchBumkamProfile = async () => {
    try {
      const res = await api.get('/settings/profile');
      if (res.profile) setBumkamProfile(res.profile);
    } catch (err) {
      console.error('Error fetching bumkam profile:', err);
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    try {
      const res = await api.get(`/settings/audit-logs?page=${page}&limit=15`);
      setAuditLogs(res.logs || []);
      setAuditTotalPages(res.pagination?.totalPages || 1);
      setAuditPage(page);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  useEffect(() => {
    fetchBumkamProfile();
    if (activeTab === 'audit') {
      fetchAuditLogs(1);
    }
  }, [activeTab]);

  const showNotification = (msg, isErr = false) => {
    if (isErr) setErrorMsg(msg);
    else setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
      setErrorMsg('');
    }, 4000);
  };

  // Handle Save BUMKam Profile
  const handleSaveBumkamProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/settings/profile', bumkamProfile);
      showNotification('Profil BUMKam berhasil disimpan.');
    } catch (err) {
      showNotification(err.message || 'Gagal menyimpan profil BUMKam.', true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Save User Profile
  const handleSaveUserProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', userProfile);
      updateUser(res.user);
      showNotification('Profil pengguna berhasil diperbarui.');
    } catch (err) {
      showNotification(err.message || 'Gagal memperbarui profil pengguna.', true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/auth/password', passwordForm);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      showNotification('Kata sandi akun berhasil diubah.');
    } catch (err) {
      showNotification(err.message || 'Gagal mengubah kata sandi.', true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Backup
  const handleBackupDownload = () => {
    window.location.href = '/api/settings/backup?token=' + localStorage.getItem('koyabhu_token');
    showNotification('File backup database mulai diunduh.');
  };

  // Handle Restore
  const handleFileRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        setConfirmModal({
          isOpen: true,
          title: 'Pulihkan (Restore) Database',
          message: 'Apakah Anda yakin ingin memulihkan database dari file ini? Data transaksi saat ini akan digantikan dengan data backup.',
          isDanger: true,
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            setLoading(true);
            try {
              await api.post('/settings/restore', { backupData });
              showNotification('Data berhasil dipulihkan (restore) sepenuhnya.');
              fetchBumkamProfile();
            } catch (err) {
              showNotification('Gagal memulihkan data: ' + err.message, true);
            } finally {
              setLoading(false);
            }
          }
        });
      } catch (err) {
        showNotification('File backup tidak valid atau rusak.', true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle Seed Demo Data
  const handleSeedDemoData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Muat Ulang Data Demo Realistis',
      message: 'Sistem akan memuat data peternakan ayam (1.200 ayam layer, 14 hari recording produksi, penjualan telur, biaya pakan, dan arus kas). Data saat ini akan di-reset.',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await api.post('/demo/seed', {});
          showNotification('Data demo peternakan dan kas berhasil dimuat!');
          fetchBumkamProfile();
        } catch (err) {
          showNotification('Gagal memuat data demo: ' + err.message, true);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Handle Reset Empty Data
  const handleResetEmpty = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Kosongkan Seluruh Data Transaksi',
      message: 'PERINGATAN: Seluruh data penjualan, pengeluaran, pemasukan, recording ayam, dan buku kas akan dihapus bersih (reset ke nol). Tindakan ini tidak dapat dibatalkan.',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await api.post('/demo/reset', {});
          showNotification('Seluruh data transaksi berhasil dikosongkan.');
          fetchBumkamProfile();
        } catch (err) {
          showNotification('Gagal mengosongkan data: ' + err.message, true);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const tabs = [
    { id: 'profile', label: 'Profil Pengguna', icon: User },
    { id: 'bumkam', label: 'Profil BUMKam', icon: Building },
    { id: 'security', label: 'Keamanan & Password', icon: Lock },
    { id: 'data', label: 'Backup & Kelola Data', icon: Database },
    { id: 'audit', label: 'Audit Trail / Riwayat', icon: History }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Pengaturan Sistem & Profil BUMKam
        </h1>
        <p className="text-xs text-slate-500">
          Kelola profil identitas usaha, keamanan akun pengelola, backup database, serta riwayat perubahan data.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PROFIL PENGGUNA */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-xl">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Profil Pengelola Aktif
          </h3>
          <form onSubmit={handleSaveUserProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Username (ID Masuk)
              </label>
              <input
                type="text"
                disabled
                value={user?.username || ''}
                className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                value={userProfile.name}
                onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jabatan di BUMKam
                </label>
                <input
                  type="text"
                  value={userProfile.jabatan}
                  onChange={(e) => setUserProfile({ ...userProfile, jabatan: e.target.value })}
                  placeholder="Contoh: Ketua BUMKam / Pengelola Kandang"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Role / Hak Akses
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.role || 'PETUGAS'}
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg text-slate-600 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={userProfile.email}
                  onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                  placeholder="email@bumkamkoyabhu.id"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  value={userProfile.phone}
                  onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Profil Pengguna</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: PROFIL BUMKam */}
      {activeTab === 'bumkam' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Identitas Badan Usaha Milik Kampung (BUMKam)
            </h3>
            {!isAdmin && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-medium">
                Hanya Ketua BUMKam (Admin) yang dapat mengubah profil lembaga
              </span>
            )}
          </div>

          <form onSubmit={handleSaveBumkamProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama BUMKam *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin}
                  value={bumkamProfile.name}
                  onChange={(e) => setBumkamProfile({ ...bumkamProfile, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg disabled:bg-slate-100 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Unit Usaha *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin}
                  value={bumkamProfile.unit_name}
                  onChange={(e) => setBumkamProfile({ ...bumkamProfile, unit_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg disabled:bg-slate-100 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kampung
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={bumkamProfile.kampung}
                  onChange={(e) => setBumkamProfile({ ...bumkamProfile, kampung: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Distrik
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={bumkamProfile.distrik}
                  onChange={(e) => setBumkamProfile({ ...bumkamProfile, distrik: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kabupaten
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={bumkamProfile.kabupaten}
                  onChange={(e) => setBumkamProfile({ ...bumkamProfile, kabupaten: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Alamat Kantor / Lokasi Kandang
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={bumkamProfile.address}
                onChange={(e) => setBumkamProfile({ ...bumkamProfile, address: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  No. Telepon / Kantor
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={bumkamProfile.phone}
                  onChange={(e) => setBumkamProfile({ ...bumkamProfile, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email Lembaga
                </label>
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={bumkamProfile.email}
                  onChange={(e) => setBumkamProfile({ ...bumkamProfile, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Saldo Kas Awal (Modal Awal) - Rp
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={bumkamProfile.initial_balance}
                onChange={(e) => setBumkamProfile({ ...bumkamProfile, initial_balance: e.target.value })}
                className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg disabled:bg-slate-100 font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Saldo awal digunakan sebagai basis awal perhitungan buku kas dan hasil usaha sebelum transaksi berjalan.
              </p>
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Profil BUMKam</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 3: KEAMANAN & PASSWORD */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-md">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Perbarui Kata Sandi Akun</span>
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kata Sandi Saat Ini *
              </label>
              <input
                type="password"
                required
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                placeholder="Masukkan kata sandi lama"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kata Sandi Baru (Min. 6 Karakter) *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Masukkan kata sandi baru"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Konfirmasi Kata Sandi Baru *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Ulangi kata sandi baru"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Ubah Kata Sandi</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: DATA & BACKUP */}
      {activeTab === 'data' && (
        <div className="space-y-6 max-w-2xl">
          {/* Backup & Restore */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Cadangkan (Backup) & Pulihkan (Restore) Data</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ekspor seluruh data transaksi peternakan dan kas ke format file cadangan terenkripsi yang aman.
              File cadangan dapat disimpan secara mandiri dan dipulihkan kapan saja bila berganti perangkat.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleBackupDownload}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Unduh Cadangan Database (JSON)</span>
              </button>

              <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-xs flex items-center gap-2 transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Pulihkan Data (Restore)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileRestore}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Demo Data Management */}
          <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-700" />
              <span>Kelola Data Demo & Pengujian Sistem</span>
            </h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Ingin mendemonstrasikan sistem kepada pengurus BUMKam dengan data realistis?
              Gunakan tombol di bawah untuk memuat data peternakan ayam (populasi 1.200 ekor, produksi 800-1.000 telur/hari, penjualan, dan pengeluaran pakan) dalam satu klik.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleSeedDemoData}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Muat Ulang Data Demo Realistis</span>
              </button>

              <button
                onClick={handleResetEmpty}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Kosongkan Semua Data (Reset ke Nol)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                <span>Audit Trail (Jejak Aktivitas & Perubahan Data)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap transaksi penambahan, pembaruan, dan pembatalan (VOID) dicatat otomatis dengan identitas pengguna dan waktu WIT.
              </p>
            </div>
            <button
              onClick={() => fetchAuditLogs(auditPage)}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Waktu (WIT)</th>
                  <th className="py-2.5 px-3">Tindakan</th>
                  <th className="py-2.5 px-3">Modul</th>
                  <th className="py-2.5 px-3">Kode Referensi</th>
                  <th className="py-2.5 px-3">Pelaku / Pengguna</th>
                  <th className="py-2.5 px-3">Rincian Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      Belum ada riwayat audit tercatat.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTimeWIT(log.created_at)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'UPDATE'
                              ? 'bg-blue-100 text-blue-800'
                              : log.action === 'VOID'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{log.module}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{log.reference_code || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">{log.user_name || 'System'}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-md truncate">{log.details || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDanger={confirmModal.isDanger}
      />
    </div>
  );
}
