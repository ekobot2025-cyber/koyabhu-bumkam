import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// Restrict reports to ADMIN (Ketua BUMKam)
router.use(authenticateToken, requireRole('ADMIN'));

// 1. LAPORAN PENJUALAN TELUR
router.get('/sales', (req, res) => {
  const { startDate, endDate, paymentStatus } = req.query;

  let query = `SELECT * FROM sales WHERE status = 'ACTIVE'`;
  const params = [];

  if (startDate) {
    query += ` AND date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND date <= ?`;
    params.push(endDate);
  }
  if (paymentStatus) {
    query += ` AND payment_status = ?`;
    params.push(paymentStatus);
  }

  query += ` ORDER BY date DESC, created_at DESC`;
  const items = db.prepare(query).all(...params);

  const totalTransactions = items.length;
  const totalEggs = items.reduce((sum, item) => sum + (item.eggs_count || 0), 0);
  const totalAmount = items.reduce((sum, item) => sum + (item.total_amount || 0), 0);
  const totalLunas = items.filter(i => i.payment_status === 'Lunas').reduce((sum, i) => sum + i.total_amount, 0);
  const totalPiutang = items.filter(i => i.payment_status === 'Belum Lunas').reduce((sum, i) => sum + i.total_amount, 0);

  res.json({
    summary: {
      totalTransactions,
      totalEggs,
      totalAmount,
      totalLunas,
      totalPiutang
    },
    items
  });
});

// 2. LAPORAN PEMASUKAN
router.get('/income', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;

  // 1. Sales that are Lunas
  let salesQuery = `
    SELECT id, invoice_number AS code, date, 'Penjualan Telur' AS category,
           customer_name AS source, total_amount AS amount, payment_method, notes, created_by_name
    FROM sales
    WHERE status = 'ACTIVE' AND payment_status = 'Lunas'
  `;
  const salesParams = [];
  if (startDate) {
    salesQuery += ` AND date >= ?`;
    salesParams.push(startDate);
  }
  if (endDate) {
    salesQuery += ` AND date <= ?`;
    salesParams.push(endDate);
  }

  // 2. Other income
  let incomeQuery = `
    SELECT id, income_number AS code, date, category,
           source, amount, payment_method, notes, created_by_name
    FROM income
    WHERE status = 'ACTIVE'
  `;
  const incomeParams = [];
  if (startDate) {
    incomeQuery += ` AND date >= ?`;
    incomeParams.push(startDate);
  }
  if (endDate) {
    incomeQuery += ` AND date <= ?`;
    incomeParams.push(endDate);
  }

  const salesItems = db.prepare(salesQuery).all(...salesParams);
  const otherItems = db.prepare(incomeQuery).all(...incomeParams);

  const allItems = [...salesItems, ...otherItems].sort((a, b) => b.date.localeCompare(a.date));

  const totalSales = salesItems.reduce((s, i) => s + i.amount, 0);
  const totalOther = otherItems.reduce((s, i) => s + i.amount, 0);
  const grandTotal = totalSales + totalOther;

  // Breakdown by category
  const categoryMap = {};
  allItems.forEach(i => {
    categoryMap[i.category] = (categoryMap[i.category] || 0) + i.amount;
  });

  res.json({
    summary: {
      totalSales,
      totalOther,
      grandTotal,
      categoryBreakdown: Object.entries(categoryMap).map(([category, amount]) => ({
        category,
        amount,
        percentage: grandTotal > 0 ? parseFloat(((amount / grandTotal) * 100).toFixed(1)) : 0
      }))
    },
    items: allItems
  });
});

// 3. LAPORAN PENGELUARAN
router.get('/expenses', authenticateToken, (req, res) => {
  const { startDate, endDate, category } = req.query;

  let query = `SELECT * FROM expenses WHERE status = 'ACTIVE'`;
  const params = [];

  if (startDate) {
    query += ` AND date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND date <= ?`;
    params.push(endDate);
  }
  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }

  query += ` ORDER BY date DESC, created_at DESC`;
  const items = db.prepare(query).all(...params);

  const grandTotal = items.reduce((sum, item) => sum + item.amount, 0);

  // Group by category
  const catMap = {};
  items.forEach(i => {
    catMap[i.category] = (catMap[i.category] || 0) + i.amount;
  });

  const categoryBreakdown = Object.entries(catMap).map(([cat, amt]) => ({
    category: cat,
    amount: amt,
    percentage: grandTotal > 0 ? parseFloat(((amt / grandTotal) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.amount - a.amount);

  res.json({
    summary: {
      grandTotal,
      totalTransactions: items.length,
      categoryBreakdown
    },
    items
  });
});

// 4. LAPORAN KAS (BUKU KAS & ARUS KAS)
router.get('/cash', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;

  const profile = db.prepare('SELECT initial_balance FROM business_profile WHERE id = 1').get();
  const baseInitialBalance = profile ? (profile.initial_balance || 0) : 0;

  // Saldo awal sebelum startDate
  let priorIn = 0;
  let priorOut = 0;
  if (startDate) {
    priorIn = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM cash_transactions
      WHERE type = 'IN' AND status = 'ACTIVE' AND date < ?
    `).get(startDate)?.total || 0;

    priorOut = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM cash_transactions
      WHERE type = 'OUT' AND status = 'ACTIVE' AND date < ?
    `).get(startDate)?.total || 0;
  }

  const openingBalance = baseInitialBalance + priorIn - priorOut;

  let query = `SELECT * FROM cash_transactions WHERE status = 'ACTIVE'`;
  const params = [];
  if (startDate) {
    query += ` AND date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND date <= ?`;
    params.push(endDate);
  }
  query += ` ORDER BY date ASC, created_at ASC`;

  const rows = db.prepare(query).all(...params);

  let running = openingBalance;
  let totalPeriodIn = 0;
  let totalPeriodOut = 0;

  const items = rows.map(r => {
    const kasMasuk = r.type === 'IN' ? r.amount : 0;
    const kasKeluar = r.type === 'OUT' ? r.amount : 0;
    running = running + kasMasuk - kasKeluar;
    totalPeriodIn += kasMasuk;
    totalPeriodOut += kasKeluar;

    return {
      ...r,
      kas_masuk: kasMasuk,
      kas_keluar: kasKeluar,
      running_balance: running
    };
  });

  res.json({
    summary: {
      openingBalance,
      totalIn: totalPeriodIn,
      totalOut: totalPeriodOut,
      closingBalance: running
    },
    items
  });
});

// 5. LAPORAN HASIL USAHA (LABA / RUGI SEDERHANA) - SECTION 12
router.get('/profit-loss', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;

  // PENDAPATAN
  // Penjualan Telur
  let salesQuery = `
    SELECT COALESCE(SUM(total_amount), 0) as total
    FROM sales
    WHERE status = 'ACTIVE'
  `;
  const salesParams = [];
  if (startDate) {
    salesQuery += ` AND date >= ?`;
    salesParams.push(startDate);
  }
  if (endDate) {
    salesQuery += ` AND date <= ?`;
    salesParams.push(endDate);
  }
  const penjualanTelur = db.prepare(salesQuery).get(...salesParams)?.total || 0;

  // Pendapatan Lainnya Breakdown
  let incomeQuery = `
    SELECT category, COALESCE(SUM(amount), 0) as total
    FROM income
    WHERE status = 'ACTIVE'
  `;
  const incomeParams = [];
  if (startDate) {
    incomeQuery += ` AND date >= ?`;
    incomeParams.push(startDate);
  }
  if (endDate) {
    incomeQuery += ` AND date <= ?`;
    incomeParams.push(endDate);
  }
  incomeQuery += ` GROUP BY category`;
  const otherIncomeRows = db.prepare(incomeQuery).all(...incomeParams);

  const totalPendapatanLainnya = otherIncomeRows.reduce((sum, r) => sum + r.total, 0);
  const totalPendapatan = penjualanTelur + totalPendapatanLainnya;

  // BIAYA OPERASIONAL BREAKDOWN
  let expenseQuery = `
    SELECT category, COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE status = 'ACTIVE'
  `;
  const expenseParams = [];
  if (startDate) {
    expenseQuery += ` AND date >= ?`;
    expenseParams.push(startDate);
  }
  if (endDate) {
    expenseQuery += ` AND date <= ?`;
    expenseParams.push(endDate);
  }
  expenseQuery += ` GROUP BY category ORDER BY total DESC`;
  const expenseRows = db.prepare(expenseQuery).all(...expenseParams);

  const totalBiaya = expenseRows.reduce((sum, r) => sum + r.total, 0);
  const hasilUsaha = totalPendapatan - totalBiaya;

  res.json({
    period: {
      startDate: startDate || null,
      endDate: endDate || null
    },
    pendapatan: {
      penjualanTelur,
      pendapatanLainnya: otherIncomeRows,
      totalPendapatanLainnya,
      totalPendapatan
    },
    biayaOperasional: {
      kategori: expenseRows,
      totalBiaya
    },
    hasilUsaha: {
      surplusDefisit: hasilUsaha,
      status: hasilUsaha >= 0 ? 'SURPLUS' : 'DEFISIT'
    }
  });
});

// 6. LAPORAN RECORDING AYAM & PRODUKSI TELUR
router.get('/chicken', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;

  let query = `SELECT * FROM chicken_recordings WHERE status = 'ACTIVE'`;
  const params = [];

  if (startDate) {
    query += ` AND date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND date <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY date DESC`;
  const rows = db.prepare(query).all(...params);

  const items = rows.map(r => {
    const popAwal = r.initial_population || 1;
    return {
      ...r,
      mortality_rate: parseFloat(((r.chicken_dead / popAwal) * 100).toFixed(2)),
      productivity_rate: parseFloat(((r.eggs_produced / popAwal) * 100).toFixed(2))
    };
  });

  const totalMasuk = items.reduce((s, i) => s + (i.chicken_in || 0), 0);
  const totalMati = items.reduce((s, i) => s + (i.chicken_dead || 0), 0);
  const totalAfkir = items.reduce((s, i) => s + (i.chicken_culled || 0), 0);
  const totalTelur = items.reduce((s, i) => s + (i.eggs_produced || 0), 0);
  const totalTelurBaik = items.reduce((s, i) => s + (i.eggs_good || 0), 0);
  const totalTelurRusak = items.reduce((s, i) => s + (i.eggs_broken || 0), 0);
  const totalPakan = items.reduce((s, i) => s + (i.feed_consumed_kg || 0), 0);

  const latestPop = items.length > 0 ? items[0].final_population : 0;

  res.json({
    summary: {
      totalDays: items.length,
      currentPopulation: latestPop,
      totalChickenIn: totalMasuk,
      totalChickenDead: totalMati,
      totalChickenCulled: totalAfkir,
      totalEggsProduced: totalTelur,
      totalEggsGood: totalTelurBaik,
      totalEggsBroken: totalTelurRusak,
      totalFeedConsumedKg: totalPakan
    },
    items
  });
});

export default router;
