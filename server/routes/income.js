import express from 'express';
import { db, transaction, generateUUID, getWITTimestamp, generateTransactionNumber, logAudit } from '../db.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// Restrict all other income management to ADMIN (Ketua BUMKam)
router.use(authenticateToken, requireRole('ADMIN'));

// GET /api/income
router.get('/', (req, res) => {
  const { search, category, startDate, endDate, status, page = 1, limit = 15 } = req.query;

  let query = `SELECT * FROM income WHERE 1=1`;
  const params = [];

  if (search) {
    query += ` AND (income_number LIKE ? OR source LIKE ? OR notes LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }

  if (startDate) {
    query += ` AND date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND date <= ?`;
    params.push(endDate);
  }

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countResult = db.prepare(countQuery).get(...params);
  const total = countResult ? countResult.total : 0;

  query += ` ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  params.push(parseInt(limit), offset);

  const items = db.prepare(query).all(...params);

  res.json({
    items,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
});

// POST /api/income
router.post('/', authenticateToken, (req, res) => {
  const { date, source, category, amount, payment_method = 'Tunai', notes, proof_file } = req.body;

  if (!date) return res.status(400).json({ error: 'Tanggal pemasukan wajib diisi.' });
  if (!source?.trim()) return res.status(400).json({ error: 'Sumber pemasukan wajib diisi.' });
  if (!category?.trim()) return res.status(400).json({ error: 'Kategori pemasukan wajib diisi.' });
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Jumlah pemasukan wajib lebih dari 0.' });

  const now = getWITTimestamp();
  const incomeNumber = generateTransactionNumber('PMK', date);
  const incomeId = generateUUID();

  try {
    transaction(() => {
      // 1. Insert income
      db.prepare(`
        INSERT INTO income (
          id, income_number, date, source, category, amount,
          payment_method, notes, proof_file, created_by, created_by_name,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
      `).run(
        incomeId,
        incomeNumber,
        date,
        source.trim(),
        category.trim(),
        amt,
        payment_method,
        notes?.trim() || null,
        proof_file || null,
        req.user.id,
        req.user.name,
        now,
        now
      );

      // 2. Insert into cash_transactions (INFLOW)
      const cashId = generateUUID();
      db.prepare(`
        INSERT INTO cash_transactions (
          id, date, transaction_number, type, category, description,
          amount, reference_type, reference_id, created_by, created_by_name,
          status, created_at
        ) VALUES (?, ?, ?, 'IN', ?, ?, ?, 'OTHER_INCOME', ?, ?, ?, 'ACTIVE', ?)
      `).run(
        cashId,
        date,
        incomeNumber,
        category.trim(),
        `${source.trim()}${notes ? ' - ' + notes.trim() : ''}`,
        amt,
        incomeId,
        req.user.id,
        req.user.name,
        now
      );

      // 3. Log Audit
      logAudit(
        'CREATE',
        'INCOME',
        incomeId,
        incomeNumber,
        req.user.id,
        req.user.name,
        `Pemasukan lainnya: ${incomeNumber} senilai Rp ${amt.toLocaleString('id-ID')} (${source})`
      );
    });

    const created = db.prepare('SELECT * FROM income WHERE id = ?').get(incomeId);
    res.status(201).json({ message: 'Pemasukan lainnya berhasil dicatat.', income: created });
  } catch (err) {
    console.error('Error saving income:', err);
    res.status(500).json({ error: 'Gagal mencatat pemasukan: ' + err.message });
  }
});

// PUT /api/income/:id
router.put('/:id', authenticateToken, (req, res) => {
  const income = db.prepare('SELECT * FROM income WHERE id = ?').get(req.params.id);
  if (!income) return res.status(404).json({ error: 'Data pemasukan tidak ditemukan.' });
  if (income.status === 'VOID') return res.status(400).json({ error: 'Pemasukan yang dibatalkan tidak dapat diedit.' });

  const { date, source, category, amount, payment_method, notes, proof_file } = req.body;

  if (!date) return res.status(400).json({ error: 'Tanggal pemasukan wajib diisi.' });
  if (!source?.trim()) return res.status(400).json({ error: 'Sumber pemasukan wajib diisi.' });
  if (!category?.trim()) return res.status(400).json({ error: 'Kategori pemasukan wajib diisi.' });
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Jumlah pemasukan wajib lebih dari 0.' });

  const now = getWITTimestamp();

  try {
    transaction(() => {
      db.prepare(`
        UPDATE income
        SET date = ?, source = ?, category = ?, amount = ?,
            payment_method = ?, notes = ?, proof_file = ?,
            updated_by = ?, updated_by_name = ?, updated_at = ?
        WHERE id = ?
      `).run(
        date,
        source.trim(),
        category.trim(),
        amt,
        payment_method,
        notes?.trim() || null,
        proof_file || income.proof_file,
        req.user.id,
        req.user.name,
        now,
        income.id
      );

      db.prepare(`
        UPDATE cash_transactions
        SET date = ?, category = ?, description = ?, amount = ?
        WHERE reference_id = ? AND reference_type = 'OTHER_INCOME' AND status = 'ACTIVE'
      `).run(
        date,
        category.trim(),
        `${source.trim()}${notes ? ' - ' + notes.trim() : ''}`,
        amt,
        income.id
      );

      logAudit(
        'UPDATE',
        'INCOME',
        income.id,
        income.income_number,
        req.user.id,
        req.user.name,
        `Memperbarui pemasukan ${income.income_number}`
      );
    });

    const updated = db.prepare('SELECT * FROM income WHERE id = ?').get(income.id);
    res.json({ message: 'Pemasukan berhasil diperbarui.', income: updated });
  } catch (err) {
    console.error('Error updating income:', err);
    res.status(500).json({ error: 'Gagal memperbarui pemasukan: ' + err.message });
  }
});

// POST /api/income/:id/void
router.post('/:id/void', authenticateToken, (req, res) => {
  const { reason } = req.body;
  const income = db.prepare('SELECT * FROM income WHERE id = ?').get(req.params.id);
  if (!income) return res.status(404).json({ error: 'Data pemasukan tidak ditemukan.' });
  if (income.status === 'VOID') return res.status(400).json({ error: 'Data ini sudah berstatus VOID.' });

  const now = getWITTimestamp();

  try {
    transaction(() => {
      db.prepare(`
        UPDATE income
        SET status = 'VOID', updated_by = ?, updated_by_name = ?, updated_at = ?
        WHERE id = ?
      `).run(req.user.id, req.user.name, now, income.id);

      db.prepare(`
        UPDATE cash_transactions
        SET status = 'VOID'
        WHERE reference_id = ? AND reference_type = 'OTHER_INCOME'
      `).run(income.id);

      logAudit(
        'VOID',
        'INCOME',
        income.id,
        income.income_number,
        req.user.id,
        req.user.name,
        `Membatalkan (VOID) pemasukan ${income.income_number}. Alasan: ${reason || 'Tanpa keterangan'}`
      );
    });

    res.json({ message: `Pemasukan ${income.income_number} berhasil dibatalkan (VOID).` });
  } catch (err) {
    console.error('Error voiding income:', err);
    res.status(500).json({ error: 'Gagal membatalkan pemasukan: ' + err.message });
  }
});

export default router;
