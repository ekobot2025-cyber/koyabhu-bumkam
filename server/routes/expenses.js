import express from 'express';
import { db, transaction, generateUUID, getWITTimestamp, generateTransactionNumber, logAudit } from '../db.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// Restrict all expense management to ADMIN (Ketua BUMKam)
router.use(authenticateToken, requireRole('ADMIN'));

// GET /api/expenses/categories
router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM expense_categories ORDER BY name ASC').all();
  res.json({ categories });
});

// POST /api/expenses/categories
router.post('/categories', authenticateToken, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
  }

  const existing = db.prepare('SELECT id FROM expense_categories WHERE LOWER(name) = LOWER(?)').get(name.trim());
  if (existing) {
    return res.status(400).json({ error: 'Kategori tersebut sudah ada.' });
  }

  const id = generateUUID();
  db.prepare('INSERT INTO expense_categories (id, name, is_default) VALUES (?, ?, 0)').run(id, name.trim());
  logAudit('CREATE', 'SETTINGS', id, name.trim(), req.user.id, req.user.name, `Menambahkan kategori pengeluaran: ${name.trim()}`);

  res.status(201).json({ message: 'Kategori baru berhasil ditambahkan.', category: { id, name: name.trim() } });
});

// GET /api/expenses
router.get('/', authenticateToken, (req, res) => {
  const { search, category, startDate, endDate, status, page = 1, limit = 15 } = req.query;

  let query = `SELECT * FROM expenses WHERE 1=1`;
  const params = [];

  if (search) {
    query += ` AND (expense_number LIKE ? OR description LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s);
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

// POST /api/expenses
router.post('/', authenticateToken, (req, res) => {
  const { date, category, description, amount, payment_method = 'Tunai', proof_file } = req.body;

  if (!date) return res.status(400).json({ error: 'Tanggal pengeluaran wajib diisi.' });
  if (!category?.trim()) return res.status(400).json({ error: 'Kategori pengeluaran wajib dipilih.' });
  if (!description?.trim()) return res.status(400).json({ error: 'Keterangan pengeluaran wajib diisi.' });
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Jumlah pengeluaran wajib lebih dari 0.' });

  const now = getWITTimestamp();
  const expenseNumber = generateTransactionNumber('PNG', date);
  const expenseId = generateUUID();

  try {
    transaction(() => {
      // 1. Insert expense
      db.prepare(`
        INSERT INTO expenses (
          id, expense_number, date, category, description, amount,
          payment_method, proof_file, created_by, created_by_name,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
      `).run(
        expenseId,
        expenseNumber,
        date,
        category.trim(),
        description.trim(),
        amt,
        payment_method,
        proof_file || null,
        req.user.id,
        req.user.name,
        now,
        now
      );

      // 2. Insert into cash_transactions (OUTFLOW)
      const cashId = generateUUID();
      db.prepare(`
        INSERT INTO cash_transactions (
          id, date, transaction_number, type, category, description,
          amount, reference_type, reference_id, created_by, created_by_name,
          status, created_at
        ) VALUES (?, ?, ?, 'OUT', ?, ?, ?, 'EXPENSE', ?, ?, ?, 'ACTIVE', ?)
      `).run(
        cashId,
        date,
        expenseNumber,
        category.trim(),
        description.trim(),
        amt,
        expenseId,
        req.user.id,
        req.user.name,
        now
      );

      // 3. Log Audit
      logAudit(
        'CREATE',
        'EXPENSES',
        expenseId,
        expenseNumber,
        req.user.id,
        req.user.name,
        `Pengeluaran baru: ${expenseNumber} senilai Rp ${amt.toLocaleString('id-ID')} (${category})`
      );
    });

    const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
    res.status(201).json({ message: 'Pengeluaran berhasil dicatat.', expense: created });
  } catch (err) {
    console.error('Error saving expense:', err);
    res.status(500).json({ error: 'Gagal mencatat pengeluaran: ' + err.message });
  }
});

// PUT /api/expenses/:id
router.put('/:id', authenticateToken, (req, res) => {
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Pengeluaran tidak ditemukan.' });
  if (expense.status === 'VOID') return res.status(400).json({ error: 'Pengeluaran yang dibatalkan tidak dapat diedit.' });

  const { date, category, description, amount, payment_method, proof_file } = req.body;

  if (!date) return res.status(400).json({ error: 'Tanggal pengeluaran wajib diisi.' });
  if (!category?.trim()) return res.status(400).json({ error: 'Kategori pengeluaran wajib dipilih.' });
  if (!description?.trim()) return res.status(400).json({ error: 'Keterangan pengeluaran wajib diisi.' });
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Jumlah pengeluaran wajib lebih dari 0.' });

  const now = getWITTimestamp();

  try {
    transaction(() => {
      db.prepare(`
        UPDATE expenses
        SET date = ?, category = ?, description = ?, amount = ?,
            payment_method = ?, proof_file = ?, updated_by = ?, updated_by_name = ?, updated_at = ?
        WHERE id = ?
      `).run(
        date,
        category.trim(),
        description.trim(),
        amt,
        payment_method,
        proof_file || expense.proof_file,
        req.user.id,
        req.user.name,
        now,
        expense.id
      );

      // Update cash transaction
      db.prepare(`
        UPDATE cash_transactions
        SET date = ?, category = ?, description = ?, amount = ?
        WHERE reference_id = ? AND reference_type = 'EXPENSE' AND status = 'ACTIVE'
      `).run(
        date,
        category.trim(),
        description.trim(),
        amt,
        expense.id
      );

      logAudit(
        'UPDATE',
        'EXPENSES',
        expense.id,
        expense.expense_number,
        req.user.id,
        req.user.name,
        `Memperbarui pengeluaran ${expense.expense_number}`
      );
    });

    const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expense.id);
    res.json({ message: 'Pengeluaran berhasil diperbarui.', expense: updated });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Gagal memperbarui pengeluaran: ' + err.message });
  }
});

// POST /api/expenses/:id/void
router.post('/:id/void', authenticateToken, (req, res) => {
  const { reason } = req.body;
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Pengeluaran tidak ditemukan.' });
  if (expense.status === 'VOID') return res.status(400).json({ error: 'Pengeluaran ini sudah berstatus VOID.' });

  const now = getWITTimestamp();

  try {
    transaction(() => {
      db.prepare(`
        UPDATE expenses
        SET status = 'VOID', updated_by = ?, updated_by_name = ?, updated_at = ?
        WHERE id = ?
      `).run(req.user.id, req.user.name, now, expense.id);

      db.prepare(`
        UPDATE cash_transactions
        SET status = 'VOID'
        WHERE reference_id = ? AND reference_type = 'EXPENSE'
      `).run(expense.id);

      logAudit(
        'VOID',
        'EXPENSES',
        expense.id,
        expense.expense_number,
        req.user.id,
        req.user.name,
        `Membatalkan (VOID) pengeluaran ${expense.expense_number}. Alasan: ${reason || 'Tanpa keterangan'}`
      );
    });

    res.json({ message: `Pengeluaran ${expense.expense_number} berhasil dibatalkan (VOID).` });
  } catch (err) {
    console.error('Error voiding expense:', err);
    res.status(500).json({ error: 'Gagal membatalkan pengeluaran: ' + err.message });
  }
});

export default router;
