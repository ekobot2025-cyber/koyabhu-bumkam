import React, { useRef } from 'react';
import { Printer, CheckCircle, Clock, X } from 'lucide-react';
import Modal from './Modal';
import { formatRupiah, formatTanggalWIT } from '../utils/formatters';

export default function ReceiptModal({ isOpen, onClose, sale }) {
  const printAreaRef = useRef(null);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bukti Transaksi Penjualan" maxWidth="max-w-lg">
      <div className="space-y-6">
        {/* Printable Card Area */}
        <div
          ref={printAreaRef}
          id="receipt-print-area"
          className="border border-slate-200 rounded-xl p-6 bg-white shadow-xs font-sans text-slate-800"
        >
          {/* Header BUMKam */}
          <div className="flex items-center gap-3 pb-4 border-b-2 border-slate-800">
            <img src="/logo.svg" alt="Logo" className="w-12 h-12 rounded-lg" />
            <div>
              <h2 className="font-bold text-base tracking-wide text-slate-900 leading-tight">
                BUMKam KOYABHU
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Unit Usaha Peternakan Ayam Petelur
              </p>
              <p className="text-[11px] text-slate-500">
                Kampung Koyabhu, Distrik Sentani Timur, Jayapura - Papua
              </p>
            </div>
          </div>

          {/* Receipt Title */}
          <div className="text-center my-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
              BUKTI PENJUALAN TELUR
            </h3>
            <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
              {sale.invoice_number}
            </div>
          </div>

          {/* Transaction Metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs py-2 border-b border-dashed border-slate-300">
            <div>
              <span className="text-slate-500 block">Tanggal Transaksi:</span>
              <span className="font-semibold text-slate-800">{formatTanggalWIT(sale.date)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Pembeli / Pelanggan:</span>
              <span className="font-semibold text-slate-800">{sale.customer_name}</span>
            </div>
          </div>

          {/* Line items table */}
          <div className="py-3 border-b border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="text-left pb-1 font-medium">Deskripsi Barang</th>
                  <th className="text-center pb-1 font-medium">Kuantitas</th>
                  <th className="text-right pb-1 font-medium">Harga Satuan</th>
                  <th className="text-right pb-1 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 text-slate-800 font-medium">
                    Telur Ayam Layer Segar
                  </td>
                  <td className="py-2 text-center text-slate-700">
                    {sale.quantity} {sale.unit}
                    {sale.unit === 'rak' && (
                      <span className="text-[10px] text-slate-500 block">
                        ({sale.eggs_count} butir)
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right text-slate-700">
                    {formatRupiah(sale.unit_price)}
                  </td>
                  <td className="py-2 text-right font-semibold text-slate-900">
                    {formatRupiah(sale.total_amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Total */}
          <div className="pt-3 space-y-1 text-xs">
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
              <span>TOTAL PEMBAYARAN</span>
              <span className="text-emerald-700 font-extrabold">
                {formatRupiah(sale.total_amount)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1 text-[11px]">
              <span>Metode Pembayaran:</span>
              <span className="font-medium text-slate-800">{sale.payment_method}</span>
            </div>
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>Status Pembayaran:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                  sale.payment_status === 'Lunas'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {sale.payment_status === 'Lunas' ? (
                  <>
                    <CheckCircle className="w-3 h-3" /> LUNAS
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" /> BELUM LUNAS
                  </>
                )}
              </span>
            </div>
            {sale.notes && (
              <div className="text-[11px] text-slate-500 italic pt-1">
                Catatan: {sale.notes}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 text-center text-xs text-slate-600">
            <div>
              <p className="text-[11px] text-slate-500 mb-10">Penerima / Pembeli</p>
              <p className="font-semibold text-slate-800 border-t border-dashed border-slate-300 mx-4 pt-1">
                {sale.customer_name}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-10">Petugas BUMKam</p>
              <p className="font-semibold text-slate-800 border-t border-dashed border-slate-300 mx-4 pt-1">
                {sale.created_by_name || 'Pengelola Usaha'}
              </p>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-slate-400">
            Terima kasih telah bermitra dengan BUMKam KOYABHU.<br />
            <span className="text-[9px] text-slate-400">Dicetak melalui KOMPLIT (Koyabhu Manajemen Pencatatan, Laporan, Informasi dan Transaksi)</span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Nota Transaksi</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
