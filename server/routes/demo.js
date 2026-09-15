import express from 'express';
import { seedDemoData } from '../seed-data.js';
import { db, logAudit } from '../db.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// POST /api/demo/seed (Admin only)
router.post('/seed', authenticateToken, requireRole('ADMIN'), (req, res) => {
  try {
    seedDemoData(req.user);
    res.json({ message: 'Data demo peternakan dan transaksi berhasil dimuat.' });
  } catch (err) {
    console.error('Error seeding demo data:', err);
    res.status(500).json({ error: 'Gagal memuat data demo: ' + err.message });
  }
});

// POST /api/demo/reset (Admin only - Clears transactional data)
router.post('/reset', authenticateToken, requireRole('ADMIN'), (req, res) => {
  try {
    db.exec(`
      DELETE FROM sales;
      DELETE FROM expenses;
      DELETE FROM income;
      DELETE FROM cash_transactions;
      DELETE FROM chicken_recordings;
      DELETE FROM audit_logs;
      UPDATE business_profile SET initial_balance = 0 WHERE id = 1;
    `);

    logAudit('RESET', 'SYSTEM', null, null, req.user.id, req.user.name, 'Mengosongkan semua data transaksi');

    res.json({ message: 'Semua data transaksi berhasil direset ke kondisi awal kosong.' });
  } catch (err) {
    console.error('Error resetting data:', err);
    res.status(500).json({ error: 'Gagal mereset data: ' + err.message });
  }
});

export default router;
