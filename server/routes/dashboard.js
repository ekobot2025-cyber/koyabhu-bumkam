import express from 'express';
import { db, getWITDate } from '../db.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// Restrict dashboard to ADMIN
router.use(authenticateToken, requireRole('ADMIN'));

// Helper to determine date range based on filter
function resolveDateRange(period, customStart, customEnd) {
  const todayStr = getWITDate();
  const today = new Date(todayStr);

  let startDate = todayStr;
  let endDate = todayStr;

  switch (period) {
    case 'today':
      startDate = todayStr;
      endDate = todayStr;
      break;
    case '7days': {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      startDate = d.toISOString().split('T')[0];
      endDate = todayStr;
      break;
    }
    case '30days': {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      startDate = d.toISOString().split('T')[0];
      endDate = todayStr;
      break;
    }
    case 'thisMonth': {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      startDate = `${year}-${month}-01`;
      endDate = todayStr;
      break;
    }
    case 'thisYear': {
      const year = today.getFullYear();
      startDate = `${year}-01-01`;
      endDate = todayStr;
      break;
    }
    case 'custom':
      startDate = customStart || todayStr;
      endDate = customEnd || todayStr;
      break;
    default: {
      // Default to 7days
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      startDate = d.toISOString().split('T')[0];
      endDate = todayStr;
      break;
    }
  }

  return { startDate, endDate };
}

// GET /api/dashboard
router.get('/', (req, res) => {
  const { period = '7days', startDate: customStart, endDate: customEnd } = req.query;
  const { startDate, endDate } = resolveDateRange(period, customStart, customEnd);
  const todayStr = getWITDate();

  // 1. ALL-TIME CASH BALANCE
  const profile = db.prepare('SELECT initial_balance FROM business_profile WHERE id = 1').get();
  const initialBalance = profile ? (profile.initial_balance || 0) : 0;

  const totalAllIn = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM cash_transactions
    WHERE type = 'IN' AND status = 'ACTIVE'
  `).get()?.total || 0;

  const totalAllOut = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM cash_transactions
    WHERE type = 'OUT' AND status = 'ACTIVE'
  `).get()?.total || 0;

  const saldoKas = initialBalance + totalAllIn - totalAllOut;

  // 2. PERIOD FINANCIAL KPIS (Hasil Usaha Sederhana = Total Pendapatan - Total Biaya)
  // Revenue: All Active Sales in period + All Active Other Income in period
  const salesRevenue = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total
    FROM sales
    WHERE status = 'ACTIVE' AND date >= ? AND date <= ?
  `).get(startDate, endDate)?.total || 0;

  const otherIncome = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM income
    WHERE status = 'ACTIVE' AND date >= ? AND date <= ?
  `).get(startDate, endDate)?.total || 0;

  const totalPendapatan = salesRevenue + otherIncome;

  const totalPengeluaran = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE status = 'ACTIVE' AND date >= ? AND date <= ?
  `).get(startDate, endDate)?.total || 0;

  const hasilUsaha = totalPendapatan - totalPengeluaran;

  // Cash Inflow & Outflow specifically in the period
  const periodKasMasuk = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM cash_transactions
    WHERE type = 'IN' AND status = 'ACTIVE' AND date >= ? AND date <= ?
  `).get(startDate, endDate)?.total || 0;

  const periodKasKeluar = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM cash_transactions
    WHERE type = 'OUT' AND status = 'ACTIVE' AND date >= ? AND date <= ?
  `).get(startDate, endDate)?.total || 0;

  // Piutang (Belum Lunas sales)
  const piutangRow = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
    FROM sales
    WHERE status = 'ACTIVE' AND payment_status = 'Belum Lunas'
  `).get();

  // 3. FARM KPIS
  // Current population: from latest recording
  const latestRecording = db.prepare(`
    SELECT * FROM chicken_recordings
    WHERE status = 'ACTIVE'
    ORDER BY date DESC
    LIMIT 1
  `).get();

  const populasiSaatIni = latestRecording ? latestRecording.final_population : 0;

  const farmPeriodStats = db.prepare(`
    SELECT COALESCE(SUM(chicken_dead), 0) as total_dead,
           COALESCE(SUM(eggs_produced), 0) as total_eggs,
           COALESCE(SUM(eggs_good), 0) as total_good_eggs,
           COALESCE(SUM(feed_consumed_kg), 0) as total_feed
    FROM chicken_recordings
    WHERE status = 'ACTIVE' AND date >= ? AND date <= ?
  `).get(startDate, endDate);

  const totalAyamMati = farmPeriodStats ? farmPeriodStats.total_dead : 0;
  const totalProduksiTelur = farmPeriodStats ? farmPeriodStats.total_eggs : 0;

  const eggsSoldPeriod = db.prepare(`
    SELECT COALESCE(SUM(eggs_count), 0) as total_sold
    FROM sales
    WHERE status = 'ACTIVE' AND date >= ? AND date <= ?
  `).get(startDate, endDate)?.total_sold || 0;

  // Productivity Rate in period: (Total Telur / (Populasi Saat Ini * Jumlah Hari)) or latest day
  let produktivitasAyam = 0;
  if (populasiSaatIni > 0) {
    if (latestRecording && latestRecording.initial_population > 0) {
      produktivitasAyam = parseFloat(((latestRecording.eggs_produced / latestRecording.initial_population) * 100).toFixed(1));
    }
  }

  // 4. OPERATIONAL ALERTS (RULE-BASED)
  const alerts = [];

  // Alert 1: Belum ada recording hari ini
  const todayRecording = db.prepare(`
    SELECT id FROM chicken_recordings WHERE date = ? AND status = 'ACTIVE'
  `).get(todayStr);

  if (!todayRecording) {
    alerts.push({
      id: 'no_recording_today',
      type: 'warning',
      title: 'Pencatatan Harian Belum Diisi',
      message: `Belum ada recording operasional ayam untuk hari ini (${todayStr}). Segera catat kondisi kandang.`,
      link: '/recordings'
    });
  }

  // Alert 2: Mortalitas ayam meningkat (jika kematian hari terakhir > 0.5% atau > 5 ekor)
  if (latestRecording) {
    const deathRate = (latestRecording.chicken_dead / (latestRecording.initial_population || 1)) * 100;
    if (deathRate > 0.5 || latestRecording.chicken_dead >= 5) {
      alerts.push({
        id: 'high_mortality',
        type: 'danger',
        title: 'Peringatan Kematian Ayam Meningkat',
        message: `Tercatat ${latestRecording.chicken_dead} ekor ayam mati pada recording terakhir (${deathRate.toFixed(2)}%). Periksa kesehatan dan ventilasi kandang.`,
        link: '/recordings'
      });
    }
  }

  // Alert 3: Pengeluaran lebih besar dari pemasukan
  if (totalPengeluaran > totalPendapatan && totalPengeluaran > 0) {
    alerts.push({
      id: 'negative_profit',
      type: 'warning',
      title: 'Pengeluaran Melampaui Pendapatan',
      message: `Dalam periode ini, total pengeluaran (Rp ${totalPengeluaran.toLocaleString('id-ID')}) melebihi pendapatan (Rp ${totalPendapatan.toLocaleString('id-ID')}). Defisit: Rp ${(totalPengeluaran - totalPendapatan).toLocaleString('id-ID')}.`,
      link: '/reports'
    });
  }

  // Alert 4: Saldo kas rendah
  if (saldoKas < 1000000) {
    alerts.push({
      id: 'low_cash',
      type: 'danger',
      title: 'Saldo Kas Menipis',
      message: `Saldo kas saat ini Rp ${saldoKas.toLocaleString('id-ID')} (di bawah ambang batas minimal Rp 1.000.000).`,
      link: '/cashbook'
    });
  }

  // Alert 5: Ada piutang belum lunas
  if (piutangRow && piutangRow.count > 0) {
    alerts.push({
      id: 'unpaid_invoices',
      type: 'info',
      title: 'Piutang Penjualan Telur',
      message: `Terdapat ${piutangRow.count} transaksi belum lunas senilai total Rp ${piutangRow.total.toLocaleString('id-ID')}.`,
      link: '/sales'
    });
  }

  // 5. CHART DATA: TREN PENJUALAN TELUR (Harian dalam periode)
  const salesTrendRows = db.prepare(`
    SELECT date,
           COALESCE(SUM(eggs_count), 0) as eggs_sold,
           COALESCE(SUM(total_amount), 0) as total_sales
    FROM sales
    WHERE status = 'ACTIVE' AND date >= ? AND date <= ?
    GROUP BY date
    ORDER BY date ASC
  `).all(startDate, endDate);

  // CHART DATA: PEMASUKAN VS PENGELUARAN (Harian)
  const cashInRows = db.prepare(`
    SELECT date, COALESCE(SUM(amount), 0) as total_in
    FROM cash_transactions
    WHERE type = 'IN' AND status = 'ACTIVE' AND date >= ? AND date <= ?
    GROUP BY date
  `).all(startDate, endDate);

  const cashOutRows = db.prepare(`
    SELECT date, COALESCE(SUM(amount), 0) as total_out
    FROM cash_transactions
    WHERE type = 'OUT' AND status = 'ACTIVE' AND date >= ? AND date <= ?
    GROUP BY date
  `).all(startDate, endDate);

  // Merge daily cash flow
  const dailyCashMap = {};
  cashInRows.forEach(r => {
    dailyCashMap[r.date] = { date: r.date, masuk: r.total_in, keluar: 0 };
  });
  cashOutRows.forEach(r => {
    if (!dailyCashMap[r.date]) {
      dailyCashMap[r.date] = { date: r.date, masuk: 0, keluar: r.total_out };
    } else {
      dailyCashMap[r.date].keluar = r.total_out;
    }
  });

  const cashComparisonChart = Object.values(dailyCashMap).sort((a, b) => a.date.localeCompare(b.date));

  // CHART DATA: DIAGRAM KATEGORI PENGELUARAN
  const expenseCategoryRows = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE status = 'ACTIVE' AND date >= ? AND date <= ?
    GROUP BY category
    ORDER BY total DESC
  `).all(startDate, endDate);

  // PRODUCTION VS MORTALITY TREND
  const farmTrendRows = db.prepare(`
    SELECT date, eggs_produced, chicken_dead, final_population
    FROM chicken_recordings
    WHERE status = 'ACTIVE' AND date >= ? AND date <= ?
    ORDER BY date ASC
  `).all(startDate, endDate);

  res.json({
    filter: {
      period,
      startDate,
      endDate
    },
    financialKPI: {
      saldoKas,
      totalPemasukan: totalPendapatan,
      totalPengeluaran,
      hasilUsaha,
      periodKasMasuk,
      periodKasKeluar,
      piutangTotal: piutangRow?.total || 0,
      piutangCount: piutangRow?.count || 0
    },
    farmKPI: {
      populasiSaatIni,
      ayamMati: totalAyamMati,
      produksiTelur: totalProduksiTelur,
      totalTelurTerjual: eggsSoldPeriod,
      produktivitasAyam
    },
    alerts,
    charts: {
      salesTrend: salesTrendRows,
      cashComparison: cashComparisonChart,
      expenseCategories: expenseCategoryRows,
      farmTrend: farmTrendRows
    }
  });
});

export default router;
