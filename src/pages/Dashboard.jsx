import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Activity,
  AlertTriangle,
  Egg,
  Calendar,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { api } from '../api/client';
import StatCard from '../components/StatCard';
import { formatRupiah, formatNumber, formatTanggalShort } from '../utils/formatters';

const PIE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B'];

export default function Dashboard({ setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let url = `/dashboard?period=${period}`;
      if (period === 'custom' && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      const res = await api.get(url);
      setData(res);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const handleCustomApply = (e) => {
    e.preventDefault();
    if (customStart && customEnd) {
      fetchDashboardData();
    }
  };

  const periodOptions = [
    { id: 'today', label: 'Hari Ini' },
    { id: '7days', label: '7 Hari' },
    { id: '30days', label: '30 Hari' },
    { id: 'thisMonth', label: 'Bulan Ini' },
    { id: 'thisYear', label: 'Tahun Ini' },
    { id: 'custom', label: 'Kustom' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Ringkasan Usaha Peternakan BUMKam</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Live Data
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data operasional dan arus kas dihitung otomatis secara terintegrasi dari database.
          </p>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {periodOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPeriod(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === opt.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={fetchDashboardData}
            title="Muat Ulang Data"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 ml-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Range Selector */}
      {period === 'custom' && (
        <form
          onSubmit={handleCustomApply}
          className="flex flex-wrap items-center gap-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl animate-in fade-in"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">Mulai:</span>
            <input
              type="date"
              required
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">Sampai:</span>
            <input
              type="date"
              required
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            Terapkan Filter
          </button>
        </form>
      )}

      {/* Operational Alerts Banner */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((al, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                al.type === 'danger'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : al.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {al.type === 'danger' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
                {al.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />}
                {al.type === 'info' && <Clock className="w-5 h-5 text-blue-600 shrink-0" />}
                <div>
                  <span className="font-bold mr-1">{al.title}:</span>
                  <span>{al.message}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (al.link === '/recordings') setActiveTab('recording');
                  else if (al.link === '/sales') setActiveTab('sales');
                  else if (al.link === '/cashbook') setActiveTab('cashbook');
                  else if (al.link === '/reports') setActiveTab('reports');
                }}
                className="shrink-0 font-bold underline hover:opacity-80 cursor-pointer"
              >
                Tindak Lanjut →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPI SECTION 1: KEUANGAN BUMKam */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>KPI Keuangan & Kas</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Rumus: Saldo = Saldo Awal + Total Kas Masuk - Total Kas Keluar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Saldo Kas Saat Ini"
            value={formatRupiah(data?.financialKPI?.saldoKas || 0)}
            subtitle="Saldo riil di kas fisik / bank"
            icon={Wallet}
            color="emerald"
          />
          <StatCard
            title="Total Pemasukan"
            value={formatRupiah(data?.financialKPI?.totalPemasukan || 0)}
            subtitle="Penjualan telur & pendapatan lain"
            icon={ArrowDownRight}
            color="blue"
          />
          <StatCard
            title="Total Pengeluaran"
            value={formatRupiah(data?.financialKPI?.totalPengeluaran || 0)}
            subtitle="Biaya pakan, obat & operasional"
            icon={ArrowUpRight}
            color="rose"
          />
          <StatCard
            title="Hasil Usaha (Surplus/Defisit)"
            value={formatRupiah(data?.financialKPI?.hasilUsaha || 0)}
            subtitle={
              (data?.financialKPI?.hasilUsaha || 0) >= 0
                ? 'Kondisi SURPLUS (Laba bersih operasional)'
                : 'Kondisi DEFISIT (Pengeluaran > Pendapatan)'
            }
            icon={TrendingUp}
            color={(data?.financialKPI?.hasilUsaha || 0) >= 0 ? 'indigo' : 'amber'}
          />
        </div>
      </div>

      {/* KPI SECTION 2: PETERNAKAN AYAM PETELUR */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Egg className="w-4 h-4 text-amber-600" />
            <span>KPI Operasional Peternakan Layer</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Monitoring populasi & produktivitas telur harian
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Populasi Ayam Hidup"
            value={`${formatNumber(data?.farmKPI?.populasiSaatIni || 0)} ekor`}
            subtitle="Populasi kandang terkini"
            icon={Activity}
            color="emerald"
          />
          <StatCard
            title="Ayam Mati (Mortalitas)"
            value={`${formatNumber(data?.farmKPI?.ayamMati || 0)} ekor`}
            subtitle="Total kematian ayam periode ini"
            icon={AlertTriangle}
            color={data?.farmKPI?.ayamMati > 5 ? 'rose' : 'slate'}
          />
          <StatCard
            title="Produksi Telur"
            value={`${formatNumber(data?.farmKPI?.produksiTelur || 0)} butir`}
            subtitle={`Rata-rata produktivitas: ${data?.farmKPI?.produktivitasAyam || 0}%`}
            icon={Egg}
            color="amber"
          />
          <StatCard
            title="Total Telur Terjual"
            value={`${formatNumber(data?.farmKPI?.totalTelurTerjual || 0)} butir`}
            subtitle="Terserap pasar & kios sekitar"
            icon={TrendingUp}
            color="teal"
          />
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Tren Penjualan Telur */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Grafik Tren Penjualan Telur
              </h3>
              <p className="text-xs text-slate-500">Kuantitas butir telur terjual per hari</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
              Telur Terjual
            </span>
          </div>

          <div className="h-64 w-full">
            {data?.charts?.salesTrend && data.charts.salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatTanggalShort}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    formatter={(value) => [`${formatNumber(value)} butir`, 'Terjual']}
                    labelFormatter={(label) => formatTanggalShort(label)}
                  />
                  <Line
                    type="monotone"
                    dataKey="eggs_sold"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10B981' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada transaksi penjualan pada periode ini.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Pemasukan vs Pengeluaran */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Perbandingan Arus Kas (Masuk vs Keluar)
              </h3>
              <p className="text-xs text-slate-500">Arus kas masuk dan keluar per hari</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Masuk
              </span>
              <span className="flex items-center gap-1 text-rose-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Keluar
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {data?.charts?.cashComparison && data.charts.cashComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.cashComparison}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatTanggalShort}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <Tooltip
                    formatter={(val, name) => [
                      formatRupiah(val),
                      name === 'masuk' ? 'Kas Masuk' : 'Kas Keluar'
                    ]}
                    labelFormatter={(label) => formatTanggalShort(label)}
                  />
                  <Bar dataKey="masuk" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="keluar" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada transaksi kas pada periode ini.
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Diagram Kategori Pengeluaran */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Komposisi Kategori Pengeluaran
              </h3>
              <p className="text-xs text-slate-500">Alokasi biaya operasional peternakan</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {data?.charts?.expenseCategories && data.charts.expenseCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.expenseCategories}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {data.charts.expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatRupiah(v), 'Biaya']} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada catatan pengeluaran pada periode ini.
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Tren Produksi & Mortalitas Kandang */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Produksi Telur & Angka Kematian Ayam
              </h3>
              <p className="text-xs text-slate-500">Monitoring kesehatan populasi harian</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {data?.charts?.farmTrend && data.charts.farmTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.farmTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatTanggalShort}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#EF4444' }} />
                  <Tooltip
                    labelFormatter={(label) => formatTanggalShort(label)}
                    formatter={(val, name) => [
                      name === 'eggs_produced' ? `${formatNumber(val)} butir` : `${val} ekor`,
                      name === 'eggs_produced' ? 'Produksi Telur' : 'Ayam Mati'
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="eggs_produced"
                    name="Produksi Telur"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="chicken_dead"
                    name="Ayam Mati"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada data recording harian pada periode ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="bg-gradient-to-r from-[#0B192C] to-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div>
          <h3 className="text-base font-bold">Akses Cepat Transaksi & Lapangan</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Pencatatan langsung dari kandang atau kantor BUMKam
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('sales')}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Penjualan</span>
          </button>
          <button
            onClick={() => setActiveTab('recording')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Recording Harian</span>
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran</span>
          </button>
        </div>
      </div>
    </div>
  );
}
