import React, { useState, useEffect } from 'react';
import {
  Plus,
  Printer,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  CheckCircle2,
  CheckCheck,
  Clock,
  Ban,
  FileSpreadsheet,
  AlertCircle,
  Send,
  Lock,
  Unlock,
  ShieldCheck,
  Egg
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import ReceiptModal from '../components/ReceiptModal';
import { formatRupiah, formatNumber, formatTanggalWIT, formatTanggalShort } from '../utils/formatters';
import { exportToCSV } from '../utils/exportHelpers';

export default function Sales() {
  const { user, isAdmin, isPetugasPenjualan } = useAuth();
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);
  const [detailSale, setDetailSale] = useState(null);
  const [voidSale, setVoidSale] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    date: todayStr,
    customer_name: '',
    quantity: '',
    unit: 'butir',
    unit_price: 2000,
    payment_method: 'Tunai',
    payment_status: 'Lunas',
    notes: ''
  });

  const fetchSales = async (page = 1) => {
    setLoading(true);
    try {
      let query = `/sales?page=${page}&limit=10`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      if (paymentFilter) query += `&paymentStatus=${paymentFilter}`;
      if (startDate) query += `&startDate=${startDate}`;
      if (endDate) query += `&endDate=${endDate}`;

      const res = await api.get(query);
      setSales(res.items || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(1);
  }, [search, statusFilter, paymentFilter, startDate, endDate]);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      date: todayStr,
      customer_name: '',
      quantity: '',
      unit: 'butir',
      unit_price: 2000,
      payment_method: 'Tunai',
      payment_status: 'Lunas',
      notes: ''
    });
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (sale) => {
    setIsEditMode(true);
    setEditingId(sale.id);
    setFormData({
      date: sale.date,
      customer_name: sale.customer_name,
      quantity: sale.quantity,
      unit: sale.unit,
      unit_price: sale.unit_price,
      payment_method: sale.payment_method,
      payment_status: sale.payment_status,
      notes: sale.notes || ''
    });
    setErrorMessage('');
    setIsFormOpen(true);
  };

  // Unit changes helper: auto-adjust unit price suggestion
  const handleUnitChange = (newUnit) => {
    let newPrice = formData.unit_price;
    if (newUnit === 'rak' && formData.unit === 'butir') {
      newPrice = formData.unit_price * 30;
    } else if (newUnit === 'butir' && formData.unit === 'rak') {
      newPrice = Math.round(formData.unit_price / 30);
    }
    setFormData({ ...formData, unit: newUnit, unit_price: newPrice });
  };

  const calculatedTotal = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.unit_price) || 0);

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setFormLoading(true);

    try {
      if (isEditMode) {
        await api.put(`/sales/${editingId}`, formData);
      } else {
        await api.post('/sales', formData);
      }
      setIsFormOpen(false);
      fetchSales(pagination.page);
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menyimpan transaksi.');
    } finally {
      setFormLoading(false);
    }
  };

  // Quick mark as Lunas
  const handleMarkAsLunas = async (sale) => {
    try {
      await api.put(`/sales/${sale.id}`, {
        ...sale,
        payment_status: 'Lunas'
      });
      fetchSales(pagination.page);
    } catch (err) {
      alert('Gagal memperbarui status: ' + err.message);
    }
  };

  // Handle Void
  const handleConfirmVoid = async () => {
    if (!voidSale) return;
    setFormLoading(true);
    try {
      await api.post(`/sales/${voidSale.id}/void`, { reason: voidReason });
      setVoidSale(null);
      setVoidReason('');
      fetchSales(pagination.page);
    } catch (err) {
      alert('Gagal membatalkan transaksi: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Workflow Status Transition (Draft -> Dikirim -> Diverifikasi -> Dikunci)
  const handleWorkflowChange = async (sale, targetStatus) => {
    try {
      await api.patch(`/sales/${sale.id}/workflow`, { target_status: targetStatus });
      fetchSales(pagination.page);
    } catch (err) {
      alert('Gagal memperbarui status alur: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    const headers = {
      invoice_number: 'No. Transaksi',
      date: 'Tanggal',
      customer_name: 'Pembeli',
      quantity: 'Kuantitas',
      unit: 'Satuan',
      eggs_count: 'Jumlah Butir',
      unit_price: 'Harga Satuan',
      total_amount: 'Total (Rp)',
      payment_method: 'Metode Bayar',
      payment_status: 'Status',
      created_by_name: 'Petugas',
      status: 'Status Data'
    };
    exportToCSV(sales, `Penjualan_Telur_KOYABHU_${todayStr}`, headers);
  };

  const columns = [
    {
      header: 'No. Transaksi',
      accessor: 'invoice_number',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">
            {row.invoice_number}
          </span>
          <span className="text-[11px] text-slate-500">{formatTanggalShort(row.date)}</span>
        </div>
      )
    },
    {
      header: 'Pembeli',
      accessor: 'customer_name',
      render: (row) => (
        <span className="font-semibold text-slate-800">{row.customer_name}</span>
      )
    },
    {
      header: 'Jumlah Telur',
      accessor: 'quantity',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900">
            {formatNumber(row.quantity)} {row.unit}
          </span>
          {row.unit === 'rak' && (
            <span className="text-[10px] text-slate-500 block">
              ({formatNumber(row.eggs_count)} butir)
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Harga Satuan',
      accessor: 'unit_price',
      render: (row) => formatRupiah(row.unit_price)
    },
    {
      header: 'Total Pembayaran',
      accessor: 'total_amount',
      render: (row) => (
        <span className="font-bold text-emerald-700 text-xs">
          {formatRupiah(row.total_amount)}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'payment_status',
      render: (row) => {
        if (row.status === 'VOID') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 line-through">
              <Ban className="w-3 h-3" /> VOID
            </span>
          );
        }
        return row.payment_status === 'Lunas' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3 h-3" /> Lunas
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" /> Piutang
          </span>
        );
      }
    },
    {
      header: 'Alur Dokumen',
      accessor: 'workflow_status',
      render: (row) => {
        const wf = row.workflow_status || 'DRAFT';
        if (wf === 'DIKUNCI') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-white shadow-xs">
              <Lock className="w-3 h-3 text-emerald-400" /> Dikunci
            </span>
          );
        }
        if (wf === 'DIVERIFIKASI') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#edf6d7] text-[#2c5b20] border border-[#d6ebbb]">
              <CheckCircle2 className="w-3 h-3 text-[#55a938]" /> Diverifikasi
            </span>
          );
        }
        if (wf === 'DIKIRIM') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              <Send className="w-3 h-3 text-sky-500" /> Diajukan
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-500" /> Draft
          </span>
        );
      }
    },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (row) => {
        const isLocked = row.workflow_status === 'DIKUNCI';
        const isDraft = !row.workflow_status || row.workflow_status === 'DRAFT';
        const isSubmitted = row.workflow_status === 'DIKIRIM';
        const isVerified = row.workflow_status === 'DIVERIFIKASI';

        return (
          <div className="flex items-center justify-end gap-1 flex-wrap">
            {/* Quick Pay Button if Belum Lunas and Active */}
            {row.payment_status === 'Belum Lunas' && row.status === 'ACTIVE' && (
              <button
                onClick={() => handleMarkAsLunas(row)}
                title="Tandai Sudah Lunas"
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
              >
                Pelunasan
              </button>
            )}

            {/* Workflow Action Transitions */}
            {row.status === 'ACTIVE' && (
              <>
                {/* Petugas / Admin: Kirim ke Ketua if Draft */}
                {isDraft && (
                  <button
                    onClick={() => handleWorkflowChange(row, 'DIKIRIM')}
                    title="Ajukan ke Ketua BUMKam"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Kirim</span>
                  </button>
                )}

                {/* Admin: Verifikasi if Dikirim */}
                {isAdmin && isSubmitted && (
                  <button
                    onClick={() => handleWorkflowChange(row, 'DIVERIFIKASI')}
                    title="Verifikasi Transaksi Penjualan"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[#55a938] hover:bg-[#46902e] text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Verifikasi</span>
                  </button>
                )}

                {/* Admin: Kunci if Diverifikasi */}
                {isAdmin && isVerified && (
                  <button
                    onClick={() => handleWorkflowChange(row, 'DIKUNCI')}
                    title="Kunci Transaksi (Permanen)"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Kunci</span>
                  </button>
                )}

                {/* Admin: Buka Kunci if Dikunci */}
                {isAdmin && isLocked && (
                  <button
                    onClick={() => handleWorkflowChange(row, 'DRAFT')}
                    title="Buka Kunci untuk Koreksi"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>Buka</span>
                  </button>
                )}
              </>
            )}

            {/* Receipt Print button */}
            <button
              onClick={() => setReceiptSale(row)}
              title="Cetak Bukti Transaksi"
              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Detail button */}
            <button
              onClick={() => setDetailSale(row)}
              title="Lihat Detail Transaksi"
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Edit button: Active, not locked, and permitted */}
            {row.status === 'ACTIVE' && !isLocked && (isAdmin || isDraft) && (
              <button
                onClick={() => handleOpenEdit(row)}
                title="Edit Transaksi"
                className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            {/* Void button: Admin only, Active, and not locked */}
            {isAdmin && row.status === 'ACTIVE' && !isLocked && (
              <button
                onClick={() => setVoidSale(row)}
                title="Batalkan (VOID) Transaksi"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Penjualan Telur Ayam
          </h1>
          <p className="text-xs text-slate-500">
            Transaksi penjualan lunas otomatis menambah kas. Penjualan belum lunas dicatat sebagai piutang.
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
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Penjualan</span>
          </button>
        </div>
      </div>

      {/* Filter and Data Table */}
      <DataTable
        columns={columns}
        data={sales}
        loading={loading}
        searchPlaceholder="Cari nama pembeli, no. faktur..."
        searchValue={search}
        onSearchChange={setSearch}
        pagination={pagination}
        onPageChange={(p) => fetchSales(p)}
        emptyMessage="Belum ada transaksi penjualan telur."
        emptyActionLabel="Catat Penjualan Sekarang"
        onEmptyAction={handleOpenAdd}
        filterControls={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="">Status Bayar: Semua</option>
              <option value="Lunas">Lunas</option>
              <option value="Belum Lunas">Belum Lunas / Piutang</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="">Status Data: Semua</option>
              <option value="ACTIVE">Aktif</option>
              <option value="VOID">VOID (Dibatalkan)</option>
            </select>
          </div>
        }
      />

      {/* Modal Add / Edit Form */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditMode ? 'Ubah Transaksi Penjualan Telur' : 'Catat Penjualan Telur Baru'}
        subtitle="Sistem akan otomatis mengintegrasikan penjualan dengan buku kas dan laporan."
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tanggal Transaksi *
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
                Nama Pembeli / Pelanggan *
              </label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Contoh: Toko Berkah / Warung Mama"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Touch Presets for Mobile Field Sales */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Tombol Cepat Penjualan (Praktis di HP / Lapangan):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '1 Rak (30)', rak: 1 },
                { label: '2 Rak (60)', rak: 2 },
                { label: '3 Rak (90)', rak: 3 },
                { label: '5 Rak (150)', rak: 5 },
                { label: '10 Rak (300)', rak: 10 },
                { label: '15 Rak (Peti)', rak: 15 }
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      quantity: p.rak,
                      unit: 'rak',
                      unit_price: prev.unit === 'rak' ? prev.unit_price : 60000
                    }));
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 hover:border-[#55a938] hover:bg-[#edf6d7] hover:text-[#18321c] text-slate-700 rounded-lg transition-colors cursor-pointer shadow-xs active:scale-95"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jumlah *
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Satuan *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => handleUnitChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="butir">Butir</option>
                <option value="rak">Rak (1 rak = 30 butir)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Harga Satuan (Rp) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Automatic Total Calculation display */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase">
              Total Pembayaran:
            </span>
            <span className="text-lg font-black text-emerald-700 font-mono">
              {formatRupiah(calculatedTotal)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Metode Pembayaran
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Tunai">Tunai (Cash)</option>
                <option value="Transfer">Transfer Bank</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Status Pembayaran *
              </label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold"
              >
                <option value="Lunas">Lunas (Otomatis Tambah Kas)</option>
                <option value="Belum Lunas">Belum Lunas / Piutang</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Transaksi
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Tambahkan catatan khusus jika ada..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              {formLoading && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isEditMode ? 'Simpan Perubahan' : 'Simpan Transaksi'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail Sale */}
      {detailSale && (
        <Modal
          isOpen={!!detailSale}
          onClose={() => setDetailSale(null)}
          title={`Detail Transaksi: ${detailSale.invoice_number}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">Nomor Faktur:</span>
                <span className="font-bold text-slate-900 font-mono">{detailSale.invoice_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tanggal:</span>
                <span className="font-semibold text-slate-800">{formatTanggalWIT(detailSale.date)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Pembeli:</span>
                <span className="font-semibold text-slate-800">{detailSale.customer_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Petugas Pencatat:</span>
                <span className="font-semibold text-slate-800">{detailSale.created_by_name || '-'}</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Kuantitas:</span>
                <span className="font-bold text-slate-900">
                  {detailSale.quantity} {detailSale.unit} ({detailSale.eggs_count} butir)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Harga Satuan:</span>
                <span className="font-bold text-slate-900">{formatRupiah(detailSale.unit_price)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-emerald-200 text-sm font-black text-emerald-900">
                <span>TOTAL:</span>
                <span>{formatRupiah(detailSale.total_amount)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="text-slate-500 block">Metode Pembayaran:</span>
                <span className="font-semibold">{detailSale.payment_method}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status Pembayaran:</span>
                <span className="font-bold text-emerald-700">{detailSale.payment_status}</span>
              </div>
            </div>

            {detailSale.notes && (
              <div>
                <span className="text-slate-500 block">Catatan:</span>
                <p className="p-2.5 bg-slate-100 rounded-lg text-slate-700 mt-1">{detailSale.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => {
                  setReceiptSale(detailSale);
                  setDetailSale(null);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Nota</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Void Modal */}
      {voidSale && (
        <ConfirmModal
          isOpen={!!voidSale}
          onClose={() => setVoidSale(null)}
          onConfirm={handleConfirmVoid}
          title="Batalkan (VOID) Transaksi Penjualan"
          message={
            <div>
              <p>
                Apakah Anda yakin ingin membatalkan transaksi{' '}
                <strong className="font-mono text-slate-900">{voidSale.invoice_number}</strong> senilai{' '}
                <strong>{formatRupiah(voidSale.total_amount)}</strong>?
              </p>
              <p className="mt-2 text-xs text-rose-600">
                Transaksi tidak akan dihapus permanen untuk audit trail, tetapi saldo kas akan dikoreksi dan transaksi dikeluarkan dari laporan.
              </p>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Pembatalan (Opsional):
                </label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Misal: Salah input kuantitas / pesanan batal"
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

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={!!receiptSale}
        onClose={() => setReceiptSale(null)}
        sale={receiptSale}
      />
    </div>
  );
}
