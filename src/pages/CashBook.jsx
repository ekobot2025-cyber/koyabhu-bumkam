import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { formatRupiah, formatTanggalShort, formatTanggalWIT } from '../utils/formatters';
import { exportToCSV, triggerPrint } from '../utils/exportHelpers';

export default function CashBook() {
  const [cashData, setCashData] = useState({
    openingBalance: 0,
    totalIn: 0,
    totalOut: 0,
    closingBalance: 0,
    items: []
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Manual cash modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [manualForm, setManualForm] = useState({
    date: todayStr,
    type: 'IN',
    category: 'Setoran Modal',
    description: '',
    amount: ''
  });

  const fetchCashBook = async () => {
    setLoading(true);
    try {
      let query = '/cash/book?';
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (typeFilter) params.push(`type=${typeFilter}`);
      if (categoryFilter) params.push(`category=${encodeURIComponent(categoryFilter)}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);

      const res = await api.get(query + params.join('&'));
      setCashData(res);
    } catch (err) {
      console.error('Error fetching cash book:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashBook();
  }, [startDate, endDate, typeFilter, categoryFilter, search]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await api.post('/cash/manual', manualForm);
      setIsManualModalOpen(false);
      setManualForm({
        date: todayStr,
        type: 'IN',
        category: 'Setoran Modal',
        description: '',
        amount: ''
      });
      fetchCashBook();
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan transaksi kas.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = {
      date: 'Tanggal',
      transaction_number: 'No. Transaksi',
      description: 'Keterangan',
      category: 'Kategori',
      reference_type: 'Referensi',
      kas_masuk: 'Kas Masuk (Rp)',
      kas_keluar: 'Kas Keluar (Rp)',
      running_balance: 'Saldo (Rp)',
      created_by_name: 'Petugas'
    };
    exportToCSV(cashData.items, `Buku_Kas_KOYABHU_${todayStr}`, headers);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Buku Kas & Arus Kas Terpadu
          </h1>
          <p className="text-xs text-slate-500">
            Pusat informasi kas BUMKam. Data terbentuk otomatis tanpa penginputan ulang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerPrint}
            className="px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak Buku Kas</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Entri Kas Manual</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block uppercase">
            Saldo Awal Periode
          </span>
          <h3 className="text-xl font-black text-slate-800 mt-1 font-mono">
            {formatRupiah(cashData.openingBalance)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Akumulasi sebelum filter tanggal</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-600 block uppercase flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" /> Total Kas Masuk
          </span>
          <h3 className="text-xl font-black text-blue-700 mt-1 font-mono">
            {formatRupiah(cashData.totalIn)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Penjualan lunas & pemasukan lain</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-rose-600 block uppercase flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Total Kas Keluar
          </span>
          <h3 className="text-xl font-black text-rose-700 mt-1 font-mono">
            {formatRupiah(cashData.totalOut)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Seluruh biaya & pengeluaran</p>
        </div>

        <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-800 block uppercase flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" /> Saldo Akhir Berjalan
          </span>
          <h3 className="text-2xl font-black text-emerald-800 mt-1 font-mono">
            {formatRupiah(cashData.closingBalance)}
          </h3>
          <p className="text-[11px] text-emerald-600 mt-1">Saldo riil terkini BUMKam</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Cari transaksi / keterangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg w-52"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
          >
            <option value="">Jenis: Semua</option>
            <option value="IN">Kas Masuk (In)</option>
            <option value="OUT">Kas Keluar (Out)</option>
          </select>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 border border-slate-300 rounded-lg">
            <span className="text-slate-500 font-medium">Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-0 text-xs p-0 focus:ring-0"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-0 text-xs p-0 focus:ring-0"
            />
          </div>

          {(startDate || endDate || typeFilter || search) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setTypeFilter('');
                setSearch('');
              }}
              className="text-xs text-rose-600 font-semibold px-2 hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        <button
          onClick={fetchCashBook}
          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
          title="Segarkan data kas"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Buku Kas Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">No. Transaksi</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Kas Masuk (Rp)</th>
                <th className="py-3 px-4 text-right">Kas Keluar (Rp)</th>
                <th className="py-3 px-4 text-right">Saldo (Rp)</th>
                <th className="py-3 px-4">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {/* Row for Opening Balance */}
              <tr className="bg-slate-50/80 font-bold text-slate-900">
                <td className="py-2.5 px-4" colSpan={4}>
                  SALDO AWAL KAS (Sebelum Periode)
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                <td className="py-2.5 px-4 text-right font-mono text-slate-400">-</td>
                <td className="py-2.5 px-4 text-right font-mono text-emerald-800 font-black">
                  {formatRupiah(cashData.openingBalance)}
                </td>
                <td className="py-2.5 px-4 text-slate-400 text-[10px]">Sistem</td>
              </tr>

              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat transaksi arus kas...
                  </td>
                </tr>
              ) : cashData.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                    Tidak ada catatan transaksi kas pada rentang waktu ini.
                  </td>
                </tr>
              ) : (
                cashData.items.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {formatTanggalShort(row.date)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      {row.transaction_number}
                    </td>
                    <td className="py-2.5 px-4 text-slate-800 max-w-xs truncate">
                      {row.description}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {row.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">
                      {row.kas_masuk > 0 ? formatRupiah(row.kas_masuk) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                      {row.kas_keluar > 0 ? formatRupiah(row.kas_keluar) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50/40">
                      {formatRupiah(row.running_balance)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                      {row.created_by_name || 'Petugas'}
                    </td>
                  </tr>
                ))
              )}

              {/* Row for Closing Balance */}
              <tr className="bg-emerald-50/60 font-bold text-slate-900 border-t-2 border-emerald-500">
                <td className="py-3 px-4" colSpan={4}>
                  SALDO AKHIR KAS BERJALAN
                </td>
                <td className="py-3 px-4 text-right font-mono text-blue-700">
                  {formatRupiah(cashData.totalIn)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-rose-700">
                  {formatRupiah(cashData.totalOut)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                  {formatRupiah(cashData.closingBalance)}
                </td>
                <td className="py-3 px-4" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Entri Kas Manual */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Entri Transaksi Kas Manual"
        subtitle="Gunakan untuk setoran modal awal, koreksi fisik kas, atau penyesuaian khusus."
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tanggal *
              </label>
              <input
                type="date"
                required
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jenis Transaksi *
              </label>
              <select
                value={manualForm.type}
                onChange={(e) => setManualForm({ ...manualForm, type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold"
              >
                <option value="IN">Kas Masuk (Penerimaan)</option>
                <option value="OUT">Kas Keluar (Pengeluaran)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Kategori *
            </label>
            <input
              type="text"
              required
              value={manualForm.category}
              onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
              placeholder="Contoh: Setoran Modal / Penyesuaian Saldo"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Keterangan / Alasan *
            </label>
            <textarea
              rows={2}
              required
              value={manualForm.description}
              onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
              placeholder="Jelaskan sumber atau tujuan transaksi ini..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nominal Kas (Rp) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={manualForm.amount}
              onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
              placeholder="0"
              className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2"
            >
              {formLoading && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>Simpan Transaksi Kas</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
