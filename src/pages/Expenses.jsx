import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, FileSpreadsheet, Ban, Tag, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { formatRupiah, formatTanggalShort, formatTanggalWIT } from '../utils/formatters';
import { exportToCSV } from '../utils/exportHelpers';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [voidExpense, setVoidExpense] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    date: todayStr,
    category: 'Pakan',
    description: '',
    amount: '',
    payment_method: 'Tunai'
  });

  const [newCategoryName, setNewCategoryName] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await api.get('/expenses/categories');
      setCategories(res.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchExpenses = async (page = 1) => {
    setLoading(true);
    try {
      let query = `/expenses?page=${page}&limit=10`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (categoryFilter) query += `&category=${encodeURIComponent(categoryFilter)}`;
      if (statusFilter) query += `&status=${statusFilter}`;

      const res = await api.get(query);
      setExpenses(res.items || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses(1);
  }, [search, categoryFilter, statusFilter]);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      date: todayStr,
      category: categories[0]?.name || 'Pakan',
      description: '',
      amount: '',
      payment_method: 'Tunai'
    });
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setEditingId(item.id);
    setFormData({
      date: item.date,
      category: item.category,
      description: item.description,
      amount: item.amount,
      payment_method: item.payment_method
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
        await api.put(`/expenses/${editingId}`, formData);
      } else {
        await api.post('/expenses', formData);
      }
      setIsFormOpen(false);
      fetchExpenses(pagination.page);
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menyimpan pengeluaran.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await api.post('/expenses/categories', { name: newCategoryName.trim() });
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      fetchCategories();
    } catch (err) {
      alert(err.message || 'Gagal membuat kategori baru.');
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidExpense) return;
    setFormLoading(true);
    try {
      await api.post(`/expenses/${voidExpense.id}/void`, { reason: voidReason });
      setVoidExpense(null);
      setVoidReason('');
      fetchExpenses(pagination.page);
    } catch (err) {
      alert('Gagal membatalkan pengeluaran: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = {
      expense_number: 'No. Transaksi',
      date: 'Tanggal',
      category: 'Kategori',
      description: 'Keterangan',
      amount: 'Jumlah (Rp)',
      payment_method: 'Metode Bayar',
      created_by_name: 'Petugas',
      status: 'Status'
    };
    exportToCSV(expenses, `Pengeluaran_KOYABHU_${todayStr}`, headers);
  };

  const columns = [
    {
      header: 'No. Transaksi',
      accessor: 'expense_number',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">
            {row.expense_number}
          </span>
          <span className="text-[11px] text-slate-500">{formatTanggalShort(row.date)}</span>
        </div>
      )
    },
    {
      header: 'Kategori',
      accessor: 'category',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">
          {row.category}
        </span>
      )
    },
    {
      header: 'Keterangan Biaya',
      accessor: 'description',
      render: (row) => (
        <span className="text-slate-800 font-medium">{row.description}</span>
      )
    },
    {
      header: 'Jumlah (Rp)',
      accessor: 'amount',
      render: (row) => (
        <span className="font-bold text-rose-600 font-mono">
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
      header: 'Petugas',
      accessor: 'created_by_name',
      render: (row) => <span className="text-slate-500 text-[11px]">{row.created_by_name || '-'}</span>
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
            title="Edit Pengeluaran"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setVoidExpense(row)}
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
            Pengeluaran Operasional
          </h1>
          <p className="text-xs text-slate-500">
            Catat semua biaya peternakan (pakan, vaksin, transportasi, dll). Otomatis memotong kas dan diperhitungkan di Hasil Usaha.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Tag className="w-4 h-4 text-slate-500" />
            <span>Kategori Baru</span>
          </button>

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
            <span>Tambah Pengeluaran</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={expenses}
        loading={loading}
        searchPlaceholder="Cari keterangan, no. transaksi..."
        searchValue={search}
        onSearchChange={setSearch}
        pagination={pagination}
        onPageChange={(p) => fetchExpenses(p)}
        emptyMessage="Belum ada catatan pengeluaran operasional."
        emptyActionLabel="Catat Pengeluaran Sekarang"
        onEmptyAction={handleOpenAdd}
        filterControls={
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
          >
            <option value="">Kategori: Semua</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        }
      />

      {/* Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditMode ? 'Ubah Catatan Pengeluaran' : 'Catat Pengeluaran Operasional'}
        subtitle="Otomatis mengurangi saldo kas BUMKam dan masuk Buku Kas."
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
                Tanggal Pengeluaran *
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
                Kategori Biaya *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Keterangan Pengeluaran *
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Contoh: Beli Pakan Ayam Layer Konsentrat 5 karung"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jumlah Pengeluaran (Rp) *
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
                <option value="Tunai">Tunai (Kas Fisik)</option>
                <option value="Transfer">Transfer Rekening Bank</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
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
              <span>{isEditMode ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Creation Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Tambah Kategori Pengeluaran Baru"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nama Kategori *
            </label>
            <input
              type="text"
              required
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Contoh: Konsumsi Petugas / Sewa Alat"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
            >
              Tambah Kategori
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Void Modal */}
      {voidExpense && (
        <ConfirmModal
          isOpen={!!voidExpense}
          onClose={() => setVoidExpense(null)}
          onConfirm={handleConfirmVoid}
          title="Batalkan (VOID) Transaksi Pengeluaran"
          message={
            <div>
              <p>
                Apakah Anda yakin ingin membatalkan pengeluaran{' '}
                <strong>{voidExpense.expense_number}</strong> senilai{' '}
                <strong>{formatRupiah(voidExpense.amount)}</strong>?
              </p>
              <p className="mt-2 text-xs text-rose-600">
                Saldo kas keluar akan dikoreksi dan dikembalikan ke saldo kas berjalan.
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
