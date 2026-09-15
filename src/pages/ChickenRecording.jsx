import React, { useState, useEffect } from 'react';
import {
  Plus,
  Egg,
  Activity,
  AlertTriangle,
  ClipboardList,
  CheckCircle,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import StatCard from '../components/StatCard';
import { formatNumber, formatTanggalShort, formatTanggalWIT } from '../utils/formatters';
import { exportToCSV } from '../utils/exportHelpers';

export default function ChickenRecording() {
  const [recordings, setRecordings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [eggStock, setEggStock] = useState({
    totalProduced: 0,
    totalGood: 0,
    totalBroken: 0,
    totalSold: 0,
    remainingStock: 0
  });

  // Modal & Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [voidRecord, setVoidRecord] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    date: todayStr,
    initial_population: 1200,
    chicken_in: 0,
    chicken_dead: 0,
    chicken_culled: 0,
    eggs_produced: 0,
    eggs_good: 0,
    eggs_broken: 0,
    feed_consumed_kg: 0,
    vaccine_info: '',
    vitamin_info: '',
    notes: ''
  });

  // Live computed final population
  const computedFinalPop =
    (parseInt(formData.initial_population, 10) || 0) +
    (parseInt(formData.chicken_in, 10) || 0) -
    (parseInt(formData.chicken_dead, 10) || 0) -
    (parseInt(formData.chicken_culled, 10) || 0);

  const computedMortalityRate =
    formData.initial_population > 0
      ? (((parseInt(formData.chicken_dead, 10) || 0) / formData.initial_population) * 100).toFixed(2)
      : '0.00';

  const computedProductivityRate =
    formData.initial_population > 0
      ? (((parseInt(formData.eggs_produced, 10) || 0) / formData.initial_population) * 100).toFixed(2)
      : '0.00';

  const fetchRecordings = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/recordings?page=${page}&limit=10`);
      setRecordings(res.items || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Error fetching recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEggStock = async () => {
    try {
      const res = await api.get('/recordings/egg-stock-summary');
      setEggStock(res);
    } catch (err) {
      console.error('Error fetching egg stock:', err);
    }
  };

  useEffect(() => {
    fetchRecordings(1);
    fetchEggStock();
  }, []);

  const handleOpenAdd = async () => {
    setIsEditMode(false);
    setEditingId(null);
    setErrorMessage('');

    // Fetch latest recording to set default initial population from yesterday's final population!
    let defaultPopAwal = 1200;
    try {
      const res = await api.get('/recordings/latest');
      if (res.latest && res.latest.final_population) {
        defaultPopAwal = res.latest.final_population;
      }
    } catch {}

    setFormData({
      date: todayStr,
      initial_population: defaultPopAwal,
      chicken_in: 0,
      chicken_dead: 0,
      chicken_culled: 0,
      eggs_produced: 0,
      eggs_good: 0,
      eggs_broken: 0,
      feed_consumed_kg: 115,
      vaccine_info: '',
      vitamin_info: '',
      notes: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setEditingId(item.id);
    setErrorMessage('');
    setFormData({
      date: item.date,
      initial_population: item.initial_population,
      chicken_in: item.chicken_in,
      chicken_dead: item.chicken_dead,
      chicken_culled: item.chicken_culled,
      eggs_produced: item.eggs_produced,
      eggs_good: item.eggs_good,
      eggs_broken: item.eggs_broken,
      feed_consumed_kg: item.feed_consumed_kg,
      vaccine_info: item.vaccine_info || '',
      vitamin_info: item.vitamin_info || '',
      notes: item.notes || ''
    });
    setIsFormOpen(true);
  };

  const handleEggsProducedChange = (val) => {
    const prod = parseInt(val, 10) || 0;
    const broken = parseInt(formData.eggs_broken, 10) || 0;
    setFormData({
      ...formData,
      eggs_produced: prod,
      eggs_good: Math.max(0, prod - broken)
    });
  };

  const handleEggsBrokenChange = (val) => {
    const broken = parseInt(val, 10) || 0;
    const prod = parseInt(formData.eggs_produced, 10) || 0;
    setFormData({
      ...formData,
      eggs_broken: broken,
      eggs_good: Math.max(0, prod - broken)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setFormLoading(true);

    try {
      if (isEditMode) {
        await api.put(`/recordings/${editingId}`, formData);
      } else {
        await api.post('/recordings', formData);
      }
      setIsFormOpen(false);
      fetchRecordings(pagination.page);
      fetchEggStock();
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menyimpan recording.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidRecord) return;
    setFormLoading(true);
    try {
      await api.post(`/recordings/${voidRecord.id}/void`, { reason: voidReason });
      setVoidRecord(null);
      setVoidReason('');
      fetchRecordings(pagination.page);
      fetchEggStock();
    } catch (err) {
      alert('Gagal membatalkan recording: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = {
      date: 'Tanggal',
      initial_population: 'Populasi Awal',
      chicken_in: 'Ayam Masuk',
      chicken_dead: 'Ayam Mati',
      chicken_culled: 'Ayam Afkir',
      final_population: 'Populasi Akhir',
      eggs_produced: 'Produksi Telur',
      eggs_good: 'Telur Baik',
      eggs_broken: 'Telur Rusak',
      feed_consumed_kg: 'Pakan (kg)',
      mortality_rate: 'Mortalitas (%)',
      productivity_rate: 'Produktivitas (%)',
      vaccine_info: 'Vaksin',
      vitamin_info: 'Vitamin',
      notes: 'Catatan',
      created_by_name: 'Petugas'
    };
    exportToCSV(recordings, `Recording_Ayam_KOYABHU_${todayStr}`, headers);
  };

  const columns = [
    {
      header: 'Tanggal',
      accessor: 'date',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">
            {formatTanggalShort(row.date)}
          </span>
          <span className="text-[11px] text-slate-500">{formatTanggalWIT(row.date)}</span>
        </div>
      )
    },
    {
      header: 'Populasi (Awal → Akhir)',
      accessor: 'final_population',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900">
            {formatNumber(row.final_population)} ekor
          </span>
          <span className="text-[10px] text-slate-500 block">
            Awal: {formatNumber(row.initial_population)}
            {row.chicken_in > 0 ? ` (+${row.chicken_in})` : ''}
          </span>
        </div>
      )
    },
    {
      header: 'Kematian & Afkir',
      accessor: 'chicken_dead',
      render: (row) => (
        <div>
          <span
            className={`font-bold inline-flex items-center gap-1 ${
              row.chicken_dead > 3 ? 'text-rose-600' : 'text-slate-700'
            }`}
          >
            {row.chicken_dead > 3 && <AlertTriangle className="w-3.5 h-3.5" />}
            {row.chicken_dead} mati ({row.mortality_rate}%)
          </span>
          {row.chicken_culled > 0 && (
            <span className="text-[10px] text-amber-600 block">
              {row.chicken_culled} afkir
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Produksi Telur',
      accessor: 'eggs_produced',
      render: (row) => (
        <div>
          <span className="font-bold text-amber-600">
            {formatNumber(row.eggs_produced)} butir
          </span>
          <span className="text-[10px] text-slate-500 block">
            {formatNumber(row.eggs_good)} baik, {row.eggs_broken} retak ({row.productivity_rate}%)
          </span>
        </div>
      )
    },
    {
      header: 'Pakan (kg)',
      accessor: 'feed_consumed_kg',
      render: (row) => (
        <span className="font-semibold text-slate-700 font-mono">
          {row.feed_consumed_kg} kg
        </span>
      )
    },
    {
      header: 'Vaksin / Vitamin',
      accessor: 'vaccine_info',
      render: (row) => (
        <div className="max-w-xs text-[11px]">
          {row.vaccine_info && (
            <span className="block text-emerald-700 font-medium truncate">
              V: {row.vaccine_info}
            </span>
          )}
          {row.vitamin_info && (
            <span className="block text-blue-700 truncate">
              O: {row.vitamin_info}
            </span>
          )}
          {!row.vaccine_info && !row.vitamin_info && (
            <span className="text-slate-400">-</span>
          )}
        </div>
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
            title="Edit Recording"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setVoidRecord(row)}
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
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Recording Ayam & Produksi Telur
          </h1>
          <p className="text-xs text-slate-500">
            Pencatatan harian populasi kandang, mortalitas, konsumsi pakan, dan produksi telur layer.
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
            <span>Catat Recording Hari Ini</span>
          </button>
        </div>
      </div>

      {/* Egg Stock Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block uppercase">
            Total Telur Diproduksi
          </span>
          <h3 className="text-xl font-black text-amber-600 mt-0.5">
            {formatNumber(eggStock.totalProduced)} butir
          </h3>
          <span className="text-[10px] text-slate-400">
            {formatNumber(eggStock.totalGood)} butir telur baik
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block uppercase">
            Total Telur Terjual
          </span>
          <h3 className="text-xl font-black text-emerald-600 mt-0.5">
            {formatNumber(eggStock.totalSold)} butir
          </h3>
          <span className="text-[10px] text-slate-400">Tersalurkan ke pembeli</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block uppercase">
            Telur Rusak / Retak
          </span>
          <h3 className="text-xl font-black text-rose-600 mt-0.5">
            {formatNumber(eggStock.totalBroken)} butir
          </h3>
          <span className="text-[10px] text-slate-400">Akumulasi telur rusak</span>
        </div>

        <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800 block uppercase">
            Sisa Stok Telur di Gudang
          </span>
          <h3 className="text-2xl font-black text-emerald-700 mt-0.5">
            {formatNumber(eggStock.remainingStock)} butir
          </h3>
          <span className="text-[10px] text-emerald-600 font-medium">Siap untuk dijual</span>
        </div>
      </div>

      {/* Recording DataTable */}
      <DataTable
        columns={columns}
        data={recordings}
        loading={loading}
        pagination={pagination}
        onPageChange={(p) => fetchRecordings(p)}
        emptyMessage="Belum ada data recording operasional ayam."
        emptyActionLabel="Catat Recording Sekarang"
        onEmptyAction={handleOpenAdd}
      />

      {/* Recording Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditMode ? 'Ubah Data Recording Ayam' : 'Catat Recording Operasional Harian'}
        subtitle="Formula otomatis: Populasi Akhir = Populasi Awal + Masuk - Mati - Afkir"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Tanggal & Populasi */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Tanggal & Dinamika Populasi Ayam (Ekor)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tanggal Recording *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Populasi Awal (Ekor) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.initial_population}
                  onChange={(e) => setFormData({ ...formData, initial_population: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ayam Masuk (+)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.chicken_in}
                  onChange={(e) => setFormData({ ...formData, chicken_in: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-rose-700 uppercase mb-1">
                  Ayam Mati (-)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.chicken_dead}
                  onChange={(e) => setFormData({ ...formData, chicken_dead: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 font-bold text-rose-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-700 uppercase mb-1">
                  Ayam Afkir (-)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.chicken_culled}
                  onChange={(e) => setFormData({ ...formData, chicken_culled: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-semibold text-amber-700"
                />
              </div>
            </div>

            {/* Calculated Final Population Box */}
            <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-emerald-950 uppercase block">
                  Populasi Akhir Terhitung:
                </span>
                <span className="text-[11px] text-emerald-800">
                  Tingkat Kematian: <strong>{computedMortalityRate}%</strong>
                </span>
              </div>
              <span className="text-xl font-black text-emerald-800 font-mono">
                {computedFinalPop} ekor
              </span>
            </div>
          </div>

          {/* Section 2: Produksi Telur */}
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Produksi Telur (Butir) & Produktivitas
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Total Diproduksi *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.eggs_produced}
                  onChange={(e) => handleEggsProducedChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">
                  Telur Bagus/Utuh
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.eggs_good}
                  onChange={(e) => setFormData({ ...formData, eggs_good: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-700 uppercase mb-1">
                  Telur Rusak / Retak
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.eggs_broken}
                  onChange={(e) => handleEggsBrokenChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold text-rose-800 bg-white border border-rose-300 rounded-lg"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-600">
              Produktivitas Ayam Hari Ini: <strong className="text-amber-800">{computedProductivityRate}%</strong>
            </div>
          </div>

          {/* Section 3: Pakan & Medis */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              3. Pakan & Kesehatan Kandang
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Konsumsi Pakan (kg) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={formData.feed_consumed_kg}
                onChange={(e) => setFormData({ ...formData, feed_consumed_kg: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Informasi Vaksinasi
                </label>
                <input
                  type="text"
                  value={formData.vaccine_info}
                  onChange={(e) => setFormData({ ...formData, vaccine_info: e.target.value })}
                  placeholder="Misal: Vaksin ND-IB Booster"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Vitamin / Suplemen / Obat
                </label>
                <input
                  type="text"
                  value={formData.vitamin_info}
                  onChange={(e) => setFormData({ ...formData, vitamin_info: e.target.value })}
                  placeholder="Misal: Vita Stress & Egg Stimulant"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Catatan Harian Kondisi Kandang
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Misal: Suhu kandang stabil, ventilasi lancar, kotoran kering..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2 cursor-pointer"
            >
              {formLoading && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isEditMode ? 'Simpan Perubahan' : 'Simpan Recording'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Void Modal */}
      {voidRecord && (
        <ConfirmModal
          isOpen={!!voidRecord}
          onClose={() => setVoidRecord(null)}
          onConfirm={handleConfirmVoid}
          title="Batalkan (VOID) Data Recording"
          message={
            <div>
              <p>
                Apakah Anda yakin ingin membatalkan recording tanggal{' '}
                <strong>{formatTanggalWIT(voidRecord.date)}</strong>?
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
