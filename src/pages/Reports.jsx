import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  Wallet,
  Egg,
  Calendar,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { api } from '../api/client';
import { formatRupiah, formatNumber, formatTanggalWIT, formatTanggalShort } from '../utils/formatters';
import { exportToCSV, triggerPrint } from '../utils/exportHelpers';

export default function Reports() {
  const [activeReport, setActiveReport] = useState('hasil-usaha');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const reportsList = [
    { id: 'hasil-usaha', label: '1. Hasil Usaha (Laba/Rugi)', icon: TrendingUp },
    { id: 'sales', label: '2. Laporan Penjualan Telur', icon: Egg },
    { id: 'cash', label: '3. Laporan Arus Kas', icon: Wallet },
    { id: 'expenses', label: '4. Laporan Pengeluaran', icon: ArrowUpRight },
    { id: 'income', label: '5. Laporan Pemasukan', icon: ArrowDownRight },
    { id: 'chicken', label: '6. Laporan Recording Ayam', icon: FileText }
  ];

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (activeReport === 'hasil-usaha') endpoint = '/reports/profit-loss';
      else if (activeReport === 'sales') endpoint = '/reports/sales';
      else if (activeReport === 'cash') endpoint = '/reports/cash';
      else if (activeReport === 'expenses') endpoint = '/reports/expenses';
      else if (activeReport === 'income') endpoint = '/reports/income';
      else if (activeReport === 'chicken') endpoint = '/reports/chicken';

      let query = `${endpoint}?`;
      if (startDate) query += `startDate=${startDate}&`;
      if (endDate) query += `endDate=${endDate}`;

      const res = await api.get(query);
      setReportData(res);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport, startDate, endDate]);

  const handleExportCSV = () => {
    if (!reportData) return;
    const todayStr = new Date().toISOString().split('T')[0];

    if (activeReport === 'sales' && reportData.items) {
      exportToCSV(reportData.items, `Laporan_Penjualan_${todayStr}`, {
        invoice_number: 'No. Faktur',
        date: 'Tanggal',
        customer_name: 'Pembeli',
        quantity: 'Kuantitas',
        unit: 'Satuan',
        unit_price: 'Harga Satuan',
        total_amount: 'Total',
        payment_status: 'Status Bayar'
      });
    } else if (activeReport === 'expenses' && reportData.items) {
      exportToCSV(reportData.items, `Laporan_Pengeluaran_${todayStr}`, {
        expense_number: 'No. Transaksi',
        date: 'Tanggal',
        category: 'Kategori',
        description: 'Keterangan',
        amount: 'Jumlah (Rp)',
        payment_method: 'Metode Bayar'
      });
    } else if (activeReport === 'cash' && reportData.items) {
      exportToCSV(reportData.items, `Laporan_Kas_${todayStr}`, {
        date: 'Tanggal',
        transaction_number: 'No. Transaksi',
        description: 'Keterangan',
        category: 'Kategori',
        kas_masuk: 'Kas Masuk',
        kas_keluar: 'Kas Keluar',
        running_balance: 'Saldo Berjalan'
      });
    } else if (activeReport === 'chicken' && reportData.items) {
      exportToCSV(reportData.items, `Laporan_Recording_${todayStr}`, {
        date: 'Tanggal',
        initial_population: 'Populasi Awal',
        chicken_dead: 'Ayam Mati',
        final_population: 'Populasi Akhir',
        eggs_produced: 'Produksi Telur',
        eggs_good: 'Telur Baik',
        eggs_broken: 'Telur Rusak',
        feed_consumed_kg: 'Pakan (kg)'
      });
    } else {
      alert('Untuk Laporan Hasil Usaha, silakan gunakan tombol Cetak Laporan / Simpan PDF.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Pusat Laporan Usaha BUMKam
          </h1>
          <p className="text-xs text-slate-500">
            Laporan pertanggungjawaban usaha, arus kas, dan hasil usaha resmi untuk pengurus dan masyarakat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerPrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {reportsList.map((rep) => {
          const Icon = rep.icon;
          const isActive = activeReport === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{rep.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date Range Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Filter Periode Laporan:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          />
          <span className="text-slate-400">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-rose-600 font-semibold px-2 hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <span className="text-[11px] text-slate-500">
          {startDate && endDate
            ? `Menampilkan data ${formatTanggalWIT(startDate)} - ${formatTanggalWIT(endDate)}`
            : 'Menampilkan seluruh data tercatat'}
        </span>
      </div>

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div
        id="printable-report"
        className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm print:border-none print:shadow-none print:p-0"
      >
        {/* Official Letterhead (Kop Surat BUMKam KOYABHU) */}
        <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-900 mb-6">
          <img src="/logo.svg" alt="KOMPLIT" className="w-16 h-16 rounded-xl" />
          <div className="flex-1">
            <h2 className="text-xl font-black text-slate-900 tracking-wider">
              BADAN USAHA MILIK KAMPUNG (BUMKam) KOYABHU
            </h2>
            <h3 className="text-sm font-bold text-emerald-700">
              KOMPLIT • SISTEM INFORMASI MANAJEMEN PETERNAKAN & KEUANGAN
            </h3>
            <p className="text-xs text-slate-600">
              Koyabhu Manajemen Pencatatan, Laporan, Informasi dan Transaksi • Sentani Timur, Jayapura, Papua
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <div>Zona Waktu: Asia/Jayapura (WIT)</div>
            <div>Dokumen Resmi BUMKam</div>
          </div>
        </div>

        {/* Dynamic Report Content based on selected Tab */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-sm">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Menyiapkan data laporan...
          </div>
        ) : (
          <div>
            {/* 1. LAPORAN HASIL USAHA (LABA/RUGI) */}
            {activeReport === 'hasil-usaha' && reportData && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-extrabold text-slate-900 uppercase tracking-wider">
                    LAPORAN HASIL USAHA
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {startDate && endDate
                      ? `Periode: ${formatTanggalWIT(startDate)} s/d ${formatTanggalWIT(endDate)}`
                      : 'Periode Berjalan (Kumulatif)'}
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6 text-xs text-slate-800">
                  {/* PENDAPATAN */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-emerald-50/80 px-4 py-2.5 font-bold text-emerald-900 uppercase tracking-wider flex justify-between">
                      <span>I. PENDAPATAN USAHA</span>
                      <span>(Rp)</span>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span>Penjualan Telur Ayam</span>
                        <span className="font-mono font-semibold">
                          {formatRupiah(reportData.pendapatan?.penjualanTelur || 0)}
                        </span>
                      </div>
                      {reportData.pendapatan?.pendapatanLainnya?.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                          <span className="pl-4">• {item.category}</span>
                          <span className="font-mono">{formatRupiah(item.total)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 text-sm font-bold text-emerald-900 border-t border-slate-200">
                        <span>TOTAL PENDAPATAN</span>
                        <span className="font-mono font-black">
                          {formatRupiah(reportData.pendapatan?.totalPendapatan || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* BIAYA OPERASIONAL */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-rose-50/80 px-4 py-2.5 font-bold text-rose-900 uppercase tracking-wider flex justify-between">
                      <span>II. BIAYA OPERASIONAL PETERNAKAN</span>
                      <span>(Rp)</span>
                    </div>
                    <div className="p-4 space-y-2">
                      {reportData.biayaOperasional?.kategori?.length === 0 ? (
                        <div className="text-slate-400 italic py-2">Belum ada biaya operasional.</div>
                      ) : (
                        reportData.biayaOperasional?.kategori?.map((item, idx) => (
                          <div key={idx} className="flex justify-between py-1 border-b border-slate-100">
                            <span>{item.category}</span>
                            <span className="font-mono font-semibold">{formatRupiah(item.total)}</span>
                          </div>
                        ))
                      )}
                      <div className="flex justify-between pt-2 text-sm font-bold text-rose-900 border-t border-slate-200">
                        <span>TOTAL BIAYA OPERASIONAL</span>
                        <span className="font-mono font-black">
                          {formatRupiah(reportData.biayaOperasional?.totalBiaya || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* HASIL USAHA (SURPLUS / DEFISIT) */}
                  <div
                    className={`p-5 rounded-xl border-2 flex items-center justify-between ${
                      reportData.hasilUsaha?.status === 'SURPLUS'
                        ? 'bg-emerald-100/60 border-emerald-500 text-emerald-950'
                        : 'bg-rose-100/60 border-rose-500 text-rose-950'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider block">
                        HASIL USAHA BERSIH
                      </span>
                      <span className="text-sm font-extrabold">
                        STATUS: {reportData.hasilUsaha?.status} (Total Pendapatan - Total Biaya)
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono">
                      {formatRupiah(reportData.hasilUsaha?.surplusDefisit || 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. LAPORAN PENJUALAN TELUR */}
            {activeReport === 'sales' && reportData && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-extrabold text-slate-900 uppercase">
                    LAPORAN TRANSAKSI PENJUALAN TELUR
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-4">
                  <div>
                    <span className="text-slate-500 block">Total Transaksi:</span>
                    <span className="font-bold text-slate-900">{reportData.summary?.totalTransactions} kali</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Telur Terjual:</span>
                    <span className="font-bold text-slate-900">{formatNumber(reportData.summary?.totalEggs)} butir</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Penjualan:</span>
                    <span className="font-bold text-emerald-700 font-mono">{formatRupiah(reportData.summary?.totalAmount)}</span>
                  </div>
                </div>

                <table className="w-full text-xs text-left">
                  <thead className="border-b-2 border-slate-300 font-bold">
                    <tr>
                      <th className="py-2">Tanggal</th>
                      <th className="py-2">No. Faktur</th>
                      <th className="py-2">Pembeli</th>
                      <th className="py-2 text-center">Jumlah</th>
                      <th className="py-2 text-right">Harga Satuan</th>
                      <th className="py-2 text-right">Total (Rp)</th>
                      <th className="py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.items?.map((item, idx) => (
                      <tr key={idx} className="py-1">
                        <td className="py-2 font-mono">{formatTanggalShort(item.date)}</td>
                        <td className="py-2 font-mono font-bold">{item.invoice_number}</td>
                        <td className="py-2">{item.customer_name}</td>
                        <td className="py-2 text-center">{item.quantity} {item.unit}</td>
                        <td className="py-2 text-right font-mono">{formatRupiah(item.unit_price)}</td>
                        <td className="py-2 text-right font-mono font-bold">{formatRupiah(item.total_amount)}</td>
                        <td className="py-2 text-center font-bold text-[10px]">{item.payment_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. LAPORAN ARUS KAS */}
            {activeReport === 'cash' && reportData && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-extrabold text-slate-900 uppercase">
                    LAPORAN ARUS KAS (BUKU KAS)
                  </h3>
                </div>

                <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-4">
                  <div>
                    <span className="text-slate-500 block">Saldo Awal:</span>
                    <span className="font-bold font-mono">{formatRupiah(reportData.summary?.openingBalance)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Kas Masuk:</span>
                    <span className="font-bold text-blue-700 font-mono">{formatRupiah(reportData.summary?.totalIn)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Kas Keluar:</span>
                    <span className="font-bold text-rose-700 font-mono">{formatRupiah(reportData.summary?.totalOut)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Saldo Akhir:</span>
                    <span className="font-bold text-emerald-800 font-mono">{formatRupiah(reportData.summary?.closingBalance)}</span>
                  </div>
                </div>

                <table className="w-full text-xs text-left">
                  <thead className="border-b-2 border-slate-300 font-bold">
                    <tr>
                      <th className="py-2">Tanggal</th>
                      <th className="py-2">No. Transaksi</th>
                      <th className="py-2">Keterangan</th>
                      <th className="py-2">Kategori</th>
                      <th className="py-2 text-right">Masuk (Rp)</th>
                      <th className="py-2 text-right">Keluar (Rp)</th>
                      <th className="py-2 text-right">Saldo (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 font-mono">{formatTanggalShort(item.date)}</td>
                        <td className="py-2 font-mono">{item.transaction_number}</td>
                        <td className="py-2">{item.description}</td>
                        <td className="py-2">{item.category}</td>
                        <td className="py-2 text-right font-mono text-blue-600 font-semibold">
                          {item.kas_masuk > 0 ? formatRupiah(item.kas_masuk) : '-'}
                        </td>
                        <td className="py-2 text-right font-mono text-rose-600 font-semibold">
                          {item.kas_keluar > 0 ? formatRupiah(item.kas_keluar) : '-'}
                        </td>
                        <td className="py-2 text-right font-mono font-bold">
                          {formatRupiah(item.running_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. LAPORAN PENGELUARAN */}
            {activeReport === 'expenses' && reportData && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-extrabold text-slate-900 uppercase">
                    LAPORAN RINCIAN BIAYA PENGELUARAN
                  </h3>
                </div>

                <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 text-xs flex justify-between items-center mb-4">
                  <span className="font-bold text-rose-900">TOTAL SELURUH BIAYA PENGELUARAN:</span>
                  <span className="text-lg font-black text-rose-700 font-mono">
                    {formatRupiah(reportData.summary?.grandTotal)}
                  </span>
                </div>

                <table className="w-full text-xs text-left">
                  <thead className="border-b-2 border-slate-300 font-bold">
                    <tr>
                      <th className="py-2">Tanggal</th>
                      <th className="py-2">No. Transaksi</th>
                      <th className="py-2">Kategori</th>
                      <th className="py-2">Keterangan</th>
                      <th className="py-2 text-right">Jumlah (Rp)</th>
                      <th className="py-2">Metode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 font-mono">{formatTanggalShort(item.date)}</td>
                        <td className="py-2 font-mono">{item.expense_number}</td>
                        <td className="py-2 font-bold">{item.category}</td>
                        <td className="py-2">{item.description}</td>
                        <td className="py-2 text-right font-mono font-bold text-rose-700">
                          {formatRupiah(item.amount)}
                        </td>
                        <td className="py-2">{item.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. LAPORAN PEMASUKAN */}
            {activeReport === 'income' && reportData && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-extrabold text-slate-900 uppercase">
                    LAPORAN SELURUH PEMASUKAN KAS
                  </h3>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 text-xs flex justify-between items-center mb-4">
                  <span className="font-bold text-blue-900">TOTAL PEMASUKAN:</span>
                  <span className="text-lg font-black text-blue-700 font-mono">
                    {formatRupiah(reportData.summary?.grandTotal)}
                  </span>
                </div>

                <table className="w-full text-xs text-left">
                  <thead className="border-b-2 border-slate-300 font-bold">
                    <tr>
                      <th className="py-2">Tanggal</th>
                      <th className="py-2">No. Bukti</th>
                      <th className="py-2">Kategori</th>
                      <th className="py-2">Sumber / Pihak Pembayar</th>
                      <th className="py-2 text-right">Jumlah (Rp)</th>
                      <th className="py-2">Metode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 font-mono">{formatTanggalShort(item.date)}</td>
                        <td className="py-2 font-mono">{item.code}</td>
                        <td className="py-2 font-bold">{item.category}</td>
                        <td className="py-2">{item.source}</td>
                        <td className="py-2 text-right font-mono font-bold text-blue-700">
                          {formatRupiah(item.amount)}
                        </td>
                        <td className="py-2">{item.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. LAPORAN RECORDING AYAM */}
            {activeReport === 'chicken' && reportData && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-extrabold text-slate-900 uppercase">
                    LAPORAN REKAPITULASI RECORDING AYAM & PRODUKSI TELUR
                  </h3>
                </div>

                <div className="grid grid-cols-4 gap-3 p-4 bg-amber-50/50 rounded-xl border border-amber-200 text-xs mb-4">
                  <div>
                    <span className="text-slate-500 block">Populasi Terkini:</span>
                    <span className="font-bold text-slate-900">{formatNumber(reportData.summary?.currentPopulation)} ekor</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Kematian:</span>
                    <span className="font-bold text-rose-700">{formatNumber(reportData.summary?.totalChickenDead)} ekor</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Produksi Telur:</span>
                    <span className="font-bold text-amber-700">{formatNumber(reportData.summary?.totalEggsProduced)} butir</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Pakan:</span>
                    <span className="font-bold text-slate-800">{formatNumber(reportData.summary?.totalFeedConsumedKg)} kg</span>
                  </div>
                </div>

                <table className="w-full text-xs text-left">
                  <thead className="border-b-2 border-slate-300 font-bold">
                    <tr>
                      <th className="py-2">Tanggal</th>
                      <th className="py-2 text-center">Pop Awal</th>
                      <th className="py-2 text-center">Mati</th>
                      <th className="py-2 text-center">Pop Akhir</th>
                      <th className="py-2 text-center">Produksi Telur</th>
                      <th className="py-2 text-center">Telur Baik</th>
                      <th className="py-2 text-center">Pakan (kg)</th>
                      <th className="py-2 text-center">Mortalitas (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 font-mono">{formatTanggalShort(item.date)}</td>
                        <td className="py-2 text-center">{formatNumber(item.initial_population)}</td>
                        <td className="py-2 text-center text-rose-600 font-bold">{item.chicken_dead}</td>
                        <td className="py-2 text-center font-bold">{formatNumber(item.final_population)}</td>
                        <td className="py-2 text-center text-amber-700 font-bold">{formatNumber(item.eggs_produced)}</td>
                        <td className="py-2 text-center text-emerald-700">{formatNumber(item.eggs_good)}</td>
                        <td className="py-2 text-center font-mono">{item.feed_consumed_kg}</td>
                        <td className="py-2 text-center font-bold">{item.mortality_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Official Signatures Section for Printing */}
        <div className="mt-14 pt-6 border-t border-slate-300 grid grid-cols-2 text-center text-xs text-slate-700">
          <div>
            <p className="text-slate-500 mb-14">Mengetahui,<br />Ketua BUMKam KOYABHU</p>
            <p className="font-bold uppercase tracking-wide border-t border-dashed border-slate-400 mx-10 pt-1">
              ( .................................................. )
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-14">Sentani Timur, {formatTanggalWIT(new Date().toISOString())}<br />Bendahara / Pengelola Keuangan</p>
            <p className="font-bold uppercase tracking-wide border-t border-dashed border-slate-400 mx-10 pt-1">
              ( .................................................. )
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
