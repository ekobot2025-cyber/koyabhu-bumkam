import React, { useRef, useState, useEffect } from 'react';
import { Printer, CheckCircle, Clock, X, FileText, Receipt } from 'lucide-react';
import Modal from './Modal';
import { formatRupiah, formatTanggalWIT } from '../utils/formatters';

export default function ReceiptModal({ isOpen, onClose, sale }) {
  const printAreaRef = useRef(null);
  const [printFormat, setPrintFormat] = useState('standard'); // 'standard' | 'thermal'

  // Manage body class for clean direct print (Ctrl + P)
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('receipt-modal-open');
    } else {
      document.body.classList.remove('receipt-modal-open');
    }
    return () => {
      document.body.classList.remove('receipt-modal-open');
    };
  }, [isOpen]);

  if (!sale) return null;

  // Isolated Clean Print Handler via Hidden Iframe (100% clean, no backdrops, no website background)
  const handlePrint = () => {
    const isThermal = printFormat === 'thermal';

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();

    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>Nota_${sale.invoice_number}</title>
          <style>
            @page {
              size: ${isThermal ? '80mm auto' : 'auto'};
              margin: ${isThermal ? '3mm' : '8mm'};
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              padding: ${isThermal ? '2mm' : '10px'};
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .slip {
              max-width: ${isThermal ? '290px' : '460px'};
              margin: 0 auto;
              padding: ${isThermal ? '12px' : '22px'};
              background: #ffffff;
              border: 1px ${isThermal ? 'dashed #94a3b8' : 'solid #334155'};
              border-radius: ${isThermal ? '4px' : '8px'};
              font-size: ${isThermal ? '11px' : '12px'};
              line-height: 1.45;
            }
            .header-center {
              text-align: center;
              padding-bottom: 10px;
              border-bottom: 2px solid #0f172a;
              margin-bottom: 12px;
            }
            .header-flex {
              display: flex;
              align-items: center;
              gap: 12px;
              padding-bottom: 10px;
              border-bottom: 2px solid #0f172a;
              margin-bottom: 12px;
            }
            .header-logo {
              width: ${isThermal ? '36px' : '44px'};
              height: ${isThermal ? '36px' : '44px'};
              object-fit: contain;
            }
            .title-box {
              text-align: center;
              margin: 10px 0;
            }
            .title-text {
              font-size: ${isThermal ? '13px' : '14px'};
              font-weight: 800;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .inv-no {
              font-family: monospace;
              font-weight: 700;
              color: #047857;
              font-size: ${isThermal ? '11px' : '12px'};
              margin-top: 2px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px;
              font-size: ${isThermal ? '10px' : '11px'};
              padding: 6px 0;
              border-top: 1px dashed #cbd5e1;
              border-bottom: 1px dashed #cbd5e1;
              margin-bottom: 10px;
            }
            .meta-right {
              text-align: right;
            }
            .meta-label {
              color: #64748b;
              font-size: 10px;
            }
            .meta-val {
              font-weight: 600;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: ${isThermal ? '10.5px' : '11.5px'};
            }
            th {
              color: #64748b;
              font-weight: 600;
              padding: 4px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            td {
              padding: 6px 0;
              border-bottom: 1px solid #f1f5f9;
            }
            .total-section {
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1.5px solid #0f172a;
            }
            .row-flex {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 4px;
            }
            .total-label {
              font-weight: 800;
              font-size: ${isThermal ? '12px' : '13px'};
            }
            .total-amount {
              font-weight: 800;
              font-size: ${isThermal ? '13px' : '15px'};
              color: #047857;
            }
            .badge-lunas {
              display: inline-block;
              padding: 2px 6px;
              background-color: #d1fae5;
              color: #065f46;
              font-weight: 700;
              border-radius: 4px;
              font-size: 10px;
            }
            .badge-piutang {
              display: inline-block;
              padding: 2px 6px;
              background-color: #fef3c7;
              color: #92400e;
              font-weight: 700;
              border-radius: 4px;
              font-size: 10px;
            }
            .signatures {
              margin-top: 24px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              text-align: center;
              font-size: 10.5px;
            }
            .sign-line {
              margin-top: 40px;
              border-top: 1px dashed #94a3b8;
              font-weight: 600;
              padding-top: 4px;
            }
            .footer-note {
              margin-top: 18px;
              text-align: center;
              font-size: 9.5px;
              color: #64748b;
              border-top: 1px dashed #e2e8f0;
              padding-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="slip">
            ${
              isThermal
                ? `
              <div class="header-center">
                <img src="/logo.svg" alt="Logo" class="header-logo" style="margin-bottom: 4px;" />
                <div style="font-weight: 800; font-size: 13px; text-transform: uppercase;">BUMKam KOYABHU</div>
                <div style="font-size: 10px; color: #475569;">Peternakan Ayam Petelur</div>
                <div style="font-size: 9px; color: #64748b;">Sentani Timur, Jayapura - Papua</div>
              </div>
            `
                : `
              <div class="header-flex">
                <img src="/logo.svg" alt="Logo" class="header-logo" />
                <div>
                  <div style="font-weight: 800; font-size: 14px; color: #0f172a; text-transform: uppercase;">BUMKam KOYABHU</div>
                  <div style="font-size: 11px; font-weight: 600; color: #047857;">Unit Usaha Peternakan Ayam Petelur</div>
                  <div style="font-size: 10px; color: #64748b;">Kampung Koyabhu, Distrik Sentani Timur, Jayapura, Papua</div>
                </div>
              </div>
            `
            }

            <div class="title-box">
              <div class="title-text">Bukti Penjualan Telur</div>
              <div class="inv-no">${sale.invoice_number}</div>
            </div>

            <div class="meta-grid">
              <div>
                <div class="meta-label">Tanggal Transaksi:</div>
                <div class="meta-val">${formatTanggalWIT(sale.date)}</div>
              </div>
              <div class="meta-right">
                <div class="meta-label">Pembeli / Pelanggan:</div>
                <div class="meta-val">${sale.customer_name}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Deskripsi</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Harga</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight: 600;">
                    Telur Layer Segar
                    ${sale.unit === 'rak' ? `<br/><span style="font-size: 9.5px; color: #64748b;">(${sale.eggs_count} butir)</span>` : ''}
                  </td>
                  <td style="text-align: center;">${sale.quantity} ${sale.unit}</td>
                  <td style="text-align: right;">${formatRupiah(sale.unit_price)}</td>
                  <td style="text-align: right; font-weight: 700;">${formatRupiah(sale.total_amount)}</td>
                </tr>
              </tbody>
            </table>

            <div class="total-section">
              <div class="row-flex">
                <span class="total-label">TOTAL BAYAR</span>
                <span class="total-amount">${formatRupiah(sale.total_amount)}</span>
              </div>
              <div class="row-flex" style="font-size: 10.5px; color: #475569;">
                <span>Metode Pembayaran:</span>
                <span style="font-weight: 600; color: #0f172a;">${sale.payment_method}</span>
              </div>
              <div class="row-flex" style="font-size: 10.5px; color: #475569;">
                <span>Status Pembayaran:</span>
                <span class="${sale.payment_status === 'Lunas' ? 'badge-lunas' : 'badge-piutang'}">
                  ${sale.payment_status === 'Lunas' ? '✓ LUNAS' : '⏳ BELUM LUNAS (PIUTANG)'}
                </span>
              </div>
              ${
                sale.notes
                  ? `
                <div style="font-size: 10px; color: #64748b; font-style: italic; margin-top: 4px;">
                  Catatan: ${sale.notes}
                </div>
              `
                  : ''
              }
            </div>

            ${
              isThermal
                ? `
              <div style="margin-top: 16px; text-align: center; font-size: 10px;">
                <div style="color: #64748b;">Petugas: ${sale.created_by_name || 'Pengelola Usaha'}</div>
              </div>
            `
                : `
              <div class="signatures">
                <div>
                  <div style="color: #64748b;">Penerima / Pembeli</div>
                  <div class="sign-line">${sale.customer_name}</div>
                </div>
                <div>
                  <div style="color: #64748b;">Petugas BUMKam</div>
                  <div class="sign-line">${sale.created_by_name || 'Pengelola Usaha'}</div>
                </div>
              </div>
            `
            }

            <div class="footer-note">
              Terima kasih telah bermitra dengan BUMKam KOYABHU.<br/>
              <b>KOMPLIT</b> (Koyabhu Manajemen Pencatatan, Laporan, Informasi dan Transaksi)
            </div>
          </div>
        </body>
      </html>
    `;

    doc.write(receiptHtml);
    doc.close();

    // Trigger isolated print
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {}
      }, 3000);
    }, 250);
  };

  const isThermal = printFormat === 'thermal';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bukti Transaksi Penjualan" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Print Format Selector Switcher */}
        <div className="flex items-center justify-between p-1.5 bg-slate-100 rounded-xl no-print">
          <button
            type="button"
            onClick={() => setPrintFormat('standard')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              printFormat === 'standard'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Format Standar (A4 / Kwitansi)</span>
          </button>
          <button
            type="button"
            onClick={() => setPrintFormat('thermal')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              printFormat === 'thermal'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Format Struk Kasir (80mm)</span>
          </button>
        </div>

        {/* Printable Card Area */}
        <div
          ref={printAreaRef}
          id="receipt-print-area"
          className={`border border-slate-300 rounded-xl bg-white shadow-xs font-sans text-slate-800 mx-auto transition-all ${
            isThermal ? 'p-4 max-w-[300px] text-xs' : 'p-6 max-w-[460px] text-xs'
          }`}
        >
          {/* Header BUMKam */}
          {isThermal ? (
            <div className="text-center pb-3 border-b-2 border-slate-900">
              <img src="/logo.svg" alt="Logo" className="w-9 h-9 mx-auto mb-1" />
              <h2 className="font-extrabold text-sm uppercase tracking-wide text-slate-900 leading-tight">
                BUMKam KOYABHU
              </h2>
              <p className="text-[10px] text-slate-600 font-semibold">
                Peternakan Ayam Petelur
              </p>
              <p className="text-[9px] text-slate-500">
                Sentani Timur, Jayapura - Papua
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 pb-4 border-b-2 border-slate-900">
              <img src="/logo.svg" alt="Logo" className="w-12 h-12 rounded-lg object-contain shrink-0" />
              <div>
                <h2 className="font-extrabold text-base tracking-wide text-slate-900 leading-tight uppercase">
                  BUMKam KOYABHU
                </h2>
                <p className="text-xs text-emerald-700 font-bold">
                  Unit Usaha Peternakan Ayam Petelur
                </p>
                <p className="text-[11px] text-slate-500">
                  Kampung Koyabhu, Distrik Sentani Timur, Jayapura - Papua
                </p>
              </div>
            </div>
          )}

          {/* Receipt Title */}
          <div className="text-center my-3">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
              BUKTI PENJUALAN TELUR
            </h3>
            <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
              {sale.invoice_number}
            </div>
          </div>

          {/* Transaction Metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-b border-dashed border-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px]">Tanggal Transaksi:</span>
              <span className="font-semibold text-slate-800">{formatTanggalWIT(sale.date)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px]">Pembeli / Pelanggan:</span>
              <span className="font-semibold text-slate-800">{sale.customer_name}</span>
            </div>
          </div>

          {/* Line items table */}
          <div className="py-2 border-b border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="text-left pb-1 font-semibold">Deskripsi</th>
                  <th className="text-center pb-1 font-semibold">Qty</th>
                  <th className="text-right pb-1 font-semibold">Harga</th>
                  <th className="text-right pb-1 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 text-slate-800 font-medium">
                    Telur Layer Segar
                    {sale.unit === 'rak' && (
                      <span className="text-[10px] text-slate-500 block">
                        ({sale.eggs_count} butir)
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-center text-slate-700 font-semibold">
                    {sale.quantity} {sale.unit}
                  </td>
                  <td className="py-2 text-right text-slate-700">
                    {formatRupiah(sale.unit_price)}
                  </td>
                  <td className="py-2 text-right font-bold text-slate-900">
                    {formatRupiah(sale.total_amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Total */}
          <div className="pt-2 space-y-1.5 text-xs">
            <div className="flex justify-between items-center font-extrabold text-sm text-slate-900 pt-1">
              <span>TOTAL BAYAR</span>
              <span className="text-emerald-700 font-black text-base">
                {formatRupiah(sale.total_amount)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>Metode Pembayaran:</span>
              <span className="font-semibold text-slate-900">{sale.payment_method}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 text-[11px]">
              <span>Status Pembayaran:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
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
          {isThermal ? (
            <div className="mt-5 pt-3 border-t border-dashed border-slate-200 text-center text-[10px] text-slate-500">
              Petugas: <span className="font-bold text-slate-800">{sale.created_by_name || 'Pengelola Usaha'}</span>
            </div>
          ) : (
            <div className="mt-7 pt-4 border-t border-slate-200 grid grid-cols-2 text-center text-xs text-slate-600">
              <div>
                <p className="text-[11px] text-slate-500 mb-8">Penerima / Pembeli</p>
                <p className="font-semibold text-slate-800 border-t border-dashed border-slate-300 mx-4 pt-1">
                  {sale.customer_name}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 mb-8">Petugas BUMKam</p>
                <p className="font-semibold text-slate-800 border-t border-dashed border-slate-300 mx-4 pt-1">
                  {sale.created_by_name || 'Pengelola Usaha'}
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-2">
            Terima kasih telah bermitra dengan BUMKam KOYABHU.<br />
            <span className="text-[9px] text-slate-500 font-semibold">
              Dicetak melalui KOMPLIT (Koyabhu Manajemen Pencatatan, Laporan, Informasi dan Transaksi)
            </span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 no-print">
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
            className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-emerald-700/20"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Nota {isThermal ? 'Struk 80mm' : 'Standar'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
