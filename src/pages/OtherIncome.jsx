import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, FileSpreadsheet, Ban, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { formatRupiah, formatTanggalShort, formatTanggalWIT } from '../utils/formatters';
import { exportToCSV } from '../utils/exportHelpers';

export default function OtherIncome() {
  const [incomes, setIncomes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [voidIncome, setVoidIncome] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    date: todayStr,
    source: '',
    category: 'Penjualan kotoran/pupuk',
    amount: '',
    payment_method: 'Tunai',
    notes: ''
  });

  const fetchIncome = async (page = 1) => {
    setLoading(true);
    try {
      let query = `/income?page=${page}&limit=10`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (categoryFilter) query += `&category=${encodeURIComponent(categoryFilter)}`;
      if (statusFilter) query += `&status=${statusFilter}`;

      const res = await api.get(query);
      setIncomes(res.items || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Error fetching income:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncome(1);
  }, [search, categoryFilter, statusFilter]);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      date: todayStr,
      source: '',
      category: 'Penjualan kotoran/pupuk',
      amount: '',
      payment_method: 'Tunai',
      notes: ''
    });
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setEditingId(item.id);
    setFormData({
      date: item.date,
      source: item.source,
      category: item.category,
      amount: item.amount,
      payment_method: item.payment_method,
      notes: item.notes || ''
    });
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setFormLoading(true);
    try {
      if (isEditMode) {
        await api.put(`/income/${editingId}`, formData);
      } else {
        await api.post('/income', formData);
      }
      setIsFormOpen(false);
      fetchIncome(pagination.page);
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menyimpan transaksi pemasukan.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidIncome) return;
    setFormLoading(true);
    try {
      await api.post(`/income/${voidIncome.id}/void`, { reason: voidReason });
      setVoidIncome(null);
      setVoidReason('');
      fetchIncome(pagination.page);
    } catch (err) {
      alert('Gagal membatalkan transaksi: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = {
      income_number: 'No. Transaksi',
      date: 'Tanggal',
      source: 'Sumber Pemasukan',
      category: 'Kategori',
      amount: 'Jumlah (Rp)',
      payment_method: 'Metode Bayar',
      notes: 'Keterangan',
      created_by_name: 'Petugas',
      status: 'Status'
    };
    exportToCSV(incomes, `Pemasukan_Lainnya_KOYABHU_${todayStr}`, headers);
  };

  const columns = [
    {
      header: 'No. Transaksi',
      accessor: 'income_number',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">
            {row.income_number}
          </span>
          <span className="text-[11px] text-slate-500">{formatTanggalShort(row.date)}</span>
        </div>
      )
    },
    {
      header: 'Sumber Pemasukan',
      accessor: 'source',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800 block">{row.source}</span>
          {row.notes && <span className="text-[11px] text-slate-500">{row.notes}</span>}
        </div>
      )
    },
    {
      header: 'Kategori',
      accessor: 'category',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
          {row.category}
        </span>
      )
    },
    {
      header: 'Jumlah (Rp)',
      accessor: 'amount',
      render: (row) => (
        <span className="font-bold text-blue-700 font-mono">
          {formatRupiah(row.amount)}
        </span>
      )
    },
    {
      header: 'Metode',
      accessor: 'payment_method',
      render: (row) => <span className="text-slate-600">{row.payment_method}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => row.status === 'VOID' ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 line-through">
          <Ban className="w-3 h-3" /> VOID
        </span>
      ) : (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
          Aktif
        </span>
      )
    },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (row) => row.status === 'ACTIVE' && (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
            title="Edit Pemasukan"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setVoidIncome(row)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Batalkan (VOID)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Pemasukan Lainnya
          </h1>
          <p className="text-xs text-slate-500">
            Catat pendapatan selain penjualan telur seperti bantuan pemerintah, penjualan pupuk kotoran, atau ayam afkir.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pemasukan</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={incomes}
        loading={loading}
        searchPlaceholder="Cari sumber atau keterangan..."
        searchValue={search}
        onSearchChange={setSearch}
        pagination={pagination}
        onPageChange={(p) => fetchIncome(p)}
        emptyMessage="Belum ada catatan pemasukan lainnya."
        emptyActionLabel="Tambah Pemasukan Sekarang"
        onEmptyAction={handleOpenAdd}
        filterControls={
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
          >
            <option value="">Kategori: Semua</option>
            <option value="Penjualan kotoran/pupuk">Penjualan kotoran/pupuk</option>
            <option value="Penjualan ayam afkir">Penjualan ayam afkir</option>
            <option value="Bantuan">Bantuan</option>
            <option value="Pendapatan lainnya">Pendapatan lainnya</option>
          </select>
        }
      />

      {/* Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditMode ? 'Ubah Catatan Pemasukan' : 'Catat Pemasukan Lainnya'}
        subtitle="Transaksi akan otomatis menambah kas BUMKam dan masuk ke Laporan."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
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
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kategori Pemasukan *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="Penjualan kotoran/pupuk">Penjualan kotoran/pupuk</option>
                <option value="Penjualan ayam afkir">Penjualan ayam afkir</option>
                <option value="Bantuan">Bantuan Pemerintah / Pihak Ketiga</option>
                <option value="Pendapatan lainnya">Pendapatan lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Sumber / Pihak Pembayar *
            </label>
            <input
              type="text"
              required
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="Contoh: Petani Kebun Sayur Sentani / Dinas Pertanian"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nominal Pemasukan (Rp) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Metode Pembayaran
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Tunai">Tunai</option>
                <option value="Transfer">Transfer</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Keterangan Tambahan
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Penjelasan detail transaksi..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
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
              <span>{isEditMode ? 'Simpan Perubahan' : 'Simpan Pemasukan'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Void Modal */}
      {voidIncome && (
        <ConfirmModal
          isOpen={!!voidIncome}
          onClose={() => setVoidIncome(null)}
          onConfirm={handleConfirmVoid}
          title="Batalkan (VOID) Transaksi Pemasukan"
          message={
            <div>
              <p>
                Apakah Anda yakin ingin membatalkan transaksi{' '}
                <strong>{voidIncome.income_number}</strong> senilai{' '}
                <strong>{formatRupiah(voidIncome.amount)}</strong>?
              </p>
              <p className="mt-2 text-xs text-rose-600">
                Saldo kas masuk akan dikoreksi dan dikeluarkan dari buku kas.
              </p>
              <div className="mt-3">
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Alasan pembatalan (opsional)"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          }
          confirmText="Ya, Batalkan (VOID)"
          isDanger={true}
          isLoading={formLoading}
        />
      )}
    </div>
  );
}
