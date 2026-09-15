import express from 'express';
import { db, transaction, generateUUID, getWITTimestamp, generateTransactionNumber, logAudit } from '../db.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// Restrict cash management to ADMIN (Ketua BUMKam)
router.use(authenticateToken, requireRole('ADMIN'));

// GET /api/cash/summary
router.get('/summary', (req, res) => {
  const profile = db.prepare('SELECT initial_balance FROM business_profile WHERE id = 1').get();
  const initialBalance = profile ? (profile.initial_balance || 0) : 0;

  const inRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_in
    FROM cash_transactions
    WHERE type = 'IN' AND status = 'ACTIVE'
  `).get();

  const outRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_out
    FROM cash_transactions
    WHERE type = 'OUT' AND status = 'ACTIVE'
  `).get();

  const totalIn = inRow ? inRow.total_in : 0;
  const totalOut = outRow ? outRow.total_out : 0;
  const currentBalance = initialBalance + totalIn - totalOut;

  res.json({
    initialBalance,
    totalIn,
    totalOut,
    currentBalance
  });
});

// GET /api/cash/book (Buku Kas with running balance)
router.get('/book', authenticateToken, (req, res) => {
  const { startDate, endDate, category, type, search } = req.query;

  const profile = db.prepare('SELECT initial_balance FROM business_profile WHERE id = 1').get();
  const baseInitialBalance = profile ? (profile.initial_balance || 0) : 0;

  // 1. Calculate opening balance prior to startDate (if startDate is specified)
  let priorIn = 0;
  let priorOut = 0;
  if (startDate) {
    const priorInRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM cash_transactions
      WHERE type = 'IN' AND status = 'ACTIVE' AND date < ?
    `).get(startDate);

    const priorOutRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM cash_transactions
      WHERE type = 'OUT' AND status = 'ACTIVE' AND date < ?
    `).get(startDate);

    priorIn = priorInRow ? priorInRow.total : 0;
    priorOut = priorOutRow ? priorOutRow.total : 0;
  }

  const periodOpeningBalance = baseInitialBalance + priorIn - priorOut;

  // 2. Query transactions for the period
  let query = `
    SELECT * FROM cash_transactions
    WHERE status = 'ACTIVE'
  `;
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
  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }
  if (search) {
    query += ` AND (transaction_number LIKE ? OR description LIKE ? OR category LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ` ORDER BY date ASC, created_at ASC`;

  const rows = db.prepare(query).all(...params);

  // 3. Compute running balance
  let running = periodOpeningBalance;
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
    openingBalance: periodOpeningBalance,
    totalIn: totalPeriodIn,
    totalOut: totalPeriodOut,
    closingBalance: running,
    items
  });
});

// POST /api/cash/manual (Manual cash entry for Setoran Modal, Penyesuaian Kas, dsb.)
router.post('/manual', authenticateToken, (req, res) => {
  const { date, type, category, description, amount } = req.body;

  if (!date) return res.status(400).json({ error: 'Tanggal wajib diisi.' });
  if (!type || !['IN', 'OUT'].includes(type)) return res.status(400).json({ error: 'Jenis transaksi kas harus IN atau OUT.' });
  if (!category?.trim()) return res.status(400).json({ error: 'Kategori wajib diisi.' });
  if (!description?.trim()) return res.status(400).json({ error: 'Keterangan wajib diisi.' });
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Nominal kas wajib lebih dari 0.' });

  const now = getWITTimestamp();
  const txNumber = generateTransactionNumber(type === 'IN' ? 'KAS-IN' : 'KAS-OUT', date);
  const id = generateUUID();

  try {
    db.prepare(`
      INSERT INTO cash_transactions (
        id, date, transaction_number, type, category, description,
        amount, reference_type, reference_id, created_by, created_by_name,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'MANUAL', ?, ?, ?, 'ACTIVE', ?)
    `).run(
      id,
      date,
      txNumber,
      type,
      category.trim(),
      description.trim(),
      amt,
      id,
      req.user.id,
      req.user.name,
      now
    );

    logAudit(
      'CREATE',
      'CASH',
      id,
      txNumber,
      req.user.id,
      req.user.name,
      `Entri kas manual: ${txNumber} (${type}) senilai Rp ${amt.toLocaleString('id-ID')}`
    );

    res.status(201).json({ message: 'Transaksi kas berhasil dicatat.' });
  } catch (err) {
    console.error('Error saving manual cash:', err);
    res.status(500).json({ error: 'Gagal mencatat transaksi kas: ' + err.message });
  }
});

export default router;
