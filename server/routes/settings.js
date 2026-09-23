import express from 'express';
import { db, transaction, getWITTimestamp, logAudit } from '../db.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// GET /api/settings/profile (Business profile)
router.get('/profile', authenticateToken, (req, res) => {
  const profile = db.prepare('SELECT * FROM business_profile WHERE id = 1').get();
  res.json({ profile });
});

// PUT /api/settings/profile (Update business profile - Admin only)
router.put('/profile', authenticateToken, requireRole('ADMIN'), (req, res) => {
  const {
    name,
    unit_name,
    address,
    kampung,
    distrik,
    kabupaten,
    provinsi,
    phone,
    email,
    logo_url,
    initial_balance
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nama BUMKam wajib diisi.' });
  }

  const initBal = parseFloat(initial_balance) || 0;
  const now = getWITTimestamp();

  db.prepare(`
    UPDATE business_profile
    SET name = ?, unit_name = ?, address = ?, kampung = ?, distrik = ?,
        kabupaten = ?, provinsi = ?, phone = ?, email = ?, logo_url = ?,
        initial_balance = ?, updated_at = ?
    WHERE id = 1
  `).run(
    name.trim(),
    unit_name?.trim() || '',
    address?.trim() || '',
    kampung?.trim() || '',
    distrik?.trim() || '',
    kabupaten?.trim() || '',
    provinsi?.trim() || '',
    phone?.trim() || '',
    email?.trim() || '',
    logo_url?.trim() || '/logo.svg',
    initBal,
    now
  );

  logAudit('UPDATE', 'SETTINGS', '1', name.trim(), req.user.id, req.user.name, 'Memperbarui profil BUMKam');

  const updated = db.prepare('SELECT * FROM business_profile WHERE id = 1').get();
  res.json({ message: 'Profil BUMKam berhasil diperbarui.', profile: updated });
});

// GET /api/settings/audit-logs
router.get('/audit-logs', authenticateToken, (req, res) => {
  const { page = 1, limit = 25, module } = req.query;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (module) {
    query += ' AND module = ?';
    params.push(module);
  }

  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countResult = db.prepare(countQuery).get(...params);
  const total = countResult ? countResult.total : 0;

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  params.push(parseInt(limit), offset);

  const logs = db.prepare(query).all(...params);

  res.json({
    logs,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
});

// GET /api/settings/backup (Export complete JSON dump - Admin only)
router.get('/backup', authenticateToken, requireRole('ADMIN'), (req, res) => {
  const users = db.prepare('SELECT id, username, password_hash, name, role, jabatan, email, phone, created_at, updated_at FROM users').all();
  const business_profile = db.prepare('SELECT * FROM business_profile').all();
  const expense_categories = db.prepare('SELECT * FROM expense_categories').all();
  const sales = db.prepare('SELECT * FROM sales').all();
  const expenses = db.prepare('SELECT * FROM expenses').all();
  const income = db.prepare('SELECT * FROM income').all();
  const cash_transactions = db.prepare('SELECT * FROM cash_transactions').all();
  const chicken_recordings = db.prepare('SELECT * FROM chicken_recordings').all();
  const audit_logs = db.prepare('SELECT * FROM audit_logs').all();

  const backupData = {
    appName: 'KOMPLIT',
    appDescription: 'Koyabhu Manajemen Pencatatan, Laporan, Informasi dan Transaksi',
    version: '1.0.0',
    exportedAt: getWITTimestamp(),
    exportedBy: req.user.name,
    data: {
      business_profile,
      expense_categories,
      sales,
      expenses,
      income,
      cash_transactions,
      chicken_recordings,
      audit_logs,
      users
    }
  };

  logAudit('BACKUP', 'SYSTEM', null, null, req.user.id, req.user.name, 'Melakukan ekspor backup database');

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=koyabhu_backup_${Date.now()}.json`);
  res.send(JSON.stringify(backupData, null, 2));
});

// POST /api/settings/restore (Restore database from JSON dump - Admin only)
router.post('/restore', authenticateToken, requireRole('ADMIN'), (req, res) => {
  const { backupData } = req.body;

  if (!backupData || !backupData.data) {
    return res.status(400).json({ error: 'Format data backup tidak valid.' });
  }

  const { data } = backupData;

  try {
    transaction(() => {
      // 1. Clear current transactional data
      db.exec(`
        DELETE FROM sales;
        DELETE FROM expenses;
        DELETE FROM income;
        DELETE FROM cash_transactions;
        DELETE FROM chicken_recordings;
        DELETE FROM audit_logs;
      `);

      // 2. Restore business profile
      if (Array.isArray(data.business_profile) && data.business_profile.length > 0) {
        db.exec('DELETE FROM business_profile;');
        const insertBp = db.prepare(`
          INSERT INTO business_profile (id, name, unit_name, address, kampung, distrik, kabupaten, provinsi, phone, email, logo_url, initial_balance, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const bp of data.business_profile) {
          insertBp.run(bp.id, bp.name, bp.unit_name, bp.address, bp.kampung, bp.distrik, bp.kabupaten, bp.provinsi, bp.phone, bp.email, bp.logo_url, bp.initial_balance, bp.updated_at);
        }
      }

      // 3. Restore Categories
      if (Array.isArray(data.expense_categories)) {
        db.exec('DELETE FROM expense_categories;');
        const insertCat = db.prepare('INSERT INTO expense_categories (id, name, is_default) VALUES (?, ?, ?)');
        for (const cat of data.expense_categories) {
          insertCat.run(cat.id, cat.name, cat.is_default);
        }
      }

      // 4. Restore Sales
      if (Array.isArray(data.sales)) {
        const insertSale = db.prepare(`
          INSERT INTO sales (id, invoice_number, date, customer_name, quantity, unit, eggs_count, unit_price, total_amount, payment_method, payment_status, payment_date, notes, created_by, created_by_name, updated_by, updated_by_name, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of data.sales) {
          insertSale.run(s.id, s.invoice_number, s.date, s.customer_name, s.quantity, s.unit, s.eggs_count, s.unit_price, s.total_amount, s.payment_method, s.payment_status, s.payment_date, s.notes, s.created_by, s.created_by_name, s.updated_by, s.updated_by_name, s.status, s.created_at, s.updated_at);
        }
      }

      // 5. Restore Expenses
      if (Array.isArray(data.expenses)) {
        const insertExp = db.prepare(`
          INSERT INTO expenses (id, expense_number, date, category, description, amount, payment_method, proof_file, created_by, created_by_name, updated_by, updated_by_name, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const e of data.expenses) {
          insertExp.run(e.id, e.expense_number, e.date, e.category, e.description, e.amount, e.payment_method, e.proof_file, e.created_by, e.created_by_name, e.updated_by, e.updated_by_name, e.status, e.created_at, e.updated_at);
        }
      }

      // 6. Restore Income
      if (Array.isArray(data.income)) {
        const insertInc = db.prepare(`
          INSERT INTO income (id, income_number, date, source, category, amount, payment_method, notes, proof_file, created_by, created_by_name, updated_by, updated_by_name, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const inc of data.income) {
          insertInc.run(inc.id, inc.income_number, inc.date, inc.source, inc.category, inc.amount, inc.payment_method, inc.notes, inc.proof_file, inc.created_by, inc.created_by_name, inc.updated_by, inc.updated_by_name, inc.status, inc.created_at, inc.updated_at);
        }
      }

      // 7. Restore Cash Transactions
      if (Array.isArray(data.cash_transactions)) {
        const insertCash = db.prepare(`
          INSERT INTO cash_transactions (id, date, transaction_number, type, category, description, amount, reference_type, reference_id, created_by, created_by_name, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const c of data.cash_transactions) {
          insertCash.run(c.id, c.date, c.transaction_number, c.type, c.category, c.description, c.amount, c.reference_type, c.reference_id, c.created_by, c.created_by_name, c.status, c.created_at);
        }
      }

      // 8. Restore Chicken Recordings
      if (Array.isArray(data.chicken_recordings)) {
        const insertRec = db.prepare(`
          INSERT INTO chicken_recordings (id, date, initial_population, chicken_in, chicken_dead, chicken_culled, final_population, eggs_produced, eggs_good, eggs_broken, feed_consumed_kg, vaccine_info, vitamin_info, notes, created_by, created_by_name, updated_by, updated_by_name, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of data.chicken_recordings) {
          insertRec.run(r.id, r.date, r.initial_population, r.chicken_in, r.chicken_dead, r.chicken_culled, r.final_population, r.eggs_produced, r.eggs_good, r.eggs_broken, r.feed_consumed_kg, r.vaccine_info, r.vitamin_info, r.notes, r.created_by, r.created_by_name, r.updated_by, r.updated_by_name, r.status, r.created_at, r.updated_at);
        }
      }

      // 9. Restore Audit Logs
      if (Array.isArray(data.audit_logs)) {
        const insertLog = db.prepare(`
          INSERT INTO audit_logs (id, action, module, reference_id, reference_code, user_id, user_name, details, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const l of data.audit_logs) {
          insertLog.run(l.id, l.action, l.module, l.reference_id, l.reference_code, l.user_id, l.user_name, l.details, l.created_at);
        }
      }

      logAudit('RESTORE', 'SYSTEM', null, null, req.user.id, req.user.name, 'Melakukan restore data dari file backup');
    });

    res.json({ message: 'Data berhasil dipulihkan (restore) sepenuhnya.' });
  } catch (err) {
    console.error('Error restoring data:', err);
    res.status(500).json({ error: 'Gagal melakukan restore data: ' + err.message });
  }
});

export default router;
