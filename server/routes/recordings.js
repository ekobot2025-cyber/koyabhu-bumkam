import express from 'express';
import { db, transaction, generateUUID, getWITTimestamp, getWITDate, logAudit } from '../db.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

// GET /api/recordings/latest (Fetch latest day recording to auto-fill initial population)
router.get('/latest', authenticateToken, (req, res) => {
  const latest = db.prepare(`
    SELECT * FROM chicken_recordings
    WHERE status = 'ACTIVE'
    ORDER BY date DESC
    LIMIT 1
  `).get();

  res.json({ latest: latest || null });
});

// GET /api/recordings/egg-stock-summary
router.get('/egg-stock-summary', authenticateToken, (req, res) => {
  // Total good eggs produced across active recordings
  const prodRow = db.prepare(`
    SELECT COALESCE(SUM(eggs_good), 0) as total_good,
           COALESCE(SUM(eggs_produced), 0) as total_produced,
           COALESCE(SUM(eggs_broken), 0) as total_broken
    FROM chicken_recordings
    WHERE status = 'ACTIVE'
  `).get();

  // Total eggs sold across active sales
  const salesRow = db.prepare(`
    SELECT COALESCE(SUM(eggs_count), 0) as total_sold
    FROM sales
    WHERE status = 'ACTIVE'
  `).get();

  const totalProduced = prodRow ? prodRow.total_produced : 0;
  const totalGood = prodRow ? prodRow.total_good : 0;
  const totalBroken = prodRow ? prodRow.total_broken : 0;
  const totalSold = salesRow ? salesRow.total_sold : 0;
  const remainingStock = Math.max(0, totalGood - totalSold);

  res.json({
    totalProduced,
    totalGood,
    totalBroken,
    totalSold,
    remainingStock
  });
});

// GET /api/recordings
router.get('/', authenticateToken, (req, res) => {
  const { startDate, endDate, status, page = 1, limit = 15 } = req.query;

  let query = `SELECT * FROM chicken_recordings WHERE 1=1`;
  const params = [];

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

  query += ` ORDER BY date DESC LIMIT ? OFFSET ?`;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  params.push(parseInt(limit), offset);

  const rawItems = db.prepare(query).all(...params);

  // Compute mortality rate and egg productivity rate for each day
  const items = rawItems.map(item => {
    const popAwal = item.initial_population || 1;
    const mortalityRate = ((item.chicken_dead / popAwal) * 100);
    const productivityRate = ((item.eggs_produced / popAwal) * 100);

    return {
      ...item,
      mortality_rate: parseFloat(mortalityRate.toFixed(2)),
      productivity_rate: parseFloat(productivityRate.toFixed(2))
    };
  });

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

// GET /api/recordings/:id
router.get('/:id', authenticateToken, (req, res) => {
  const rec = db.prepare('SELECT * FROM chicken_recordings WHERE id = ?').get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Data recording tidak ditemukan.' });
  res.json({ recording: rec });
});

// POST /api/recordings
router.post('/', authenticateToken, (req, res) => {
  const {
    date,
    initial_population,
    chicken_in = 0,
    chicken_dead = 0,
    chicken_culled = 0,
    eggs_produced = 0,
    eggs_good = 0,
    eggs_broken = 0,
    feed_consumed_kg = 0,
    vaccine_info,
    vitamin_info,
    notes
  } = req.body;

  if (!date) return res.status(400).json({ error: 'Tanggal recording wajib diisi.' });

  const popAwal = parseInt(initial_population, 10);
  if (isNaN(popAwal) || popAwal <= 0) {
    return res.status(400).json({ error: 'Populasi awal wajib lebih dari 0 ekor.' });
  }

  const masuk = parseInt(chicken_in, 10) || 0;
  const mati = parseInt(chicken_dead, 10) || 0;
  const afkir = parseInt(chicken_culled, 10) || 0;

  if (masuk < 0 || mati < 0 || afkir < 0) {
    return res.status(400).json({ error: 'Jumlah ayam masuk, mati, atau afkir tidak boleh negatif.' });
  }

  const totalTersedia = popAwal + masuk;
  if (mati + afkir > totalTersedia) {
    return res.status(400).json({
      error: `Jumlah ayam mati (${mati}) dan afkir (${afkir}) melebihi total ayam yang tersedia (${totalTersedia} ekor).`
    });
  }

  const popAkhir = popAwal + masuk - mati - afkir;

  const prod = parseInt(eggs_produced, 10) || 0;
  let baik = parseInt(eggs_good, 10) || 0;
  const rusak = parseInt(eggs_broken, 10) || 0;

  if (prod < 0 || baik < 0 || rusak < 0) {
    return res.status(400).json({ error: 'Jumlah produksi telur tidak boleh negatif.' });
  }

  // Auto calculate good eggs if not explicitly balanced
  if (baik === 0 && prod > 0 && rusak === 0) {
    baik = prod;
  } else if (baik + rusak !== prod && prod > 0) {
    baik = Math.max(0, prod - rusak);
  }

  const feed = parseFloat(feed_consumed_kg) || 0;
  if (feed < 0) return res.status(400).json({ error: 'Konsumsi pakan tidak boleh negatif.' });

  // Check if recording for this date already exists
  const existing = db.prepare("SELECT id FROM chicken_recordings WHERE date = ? AND status = 'ACTIVE'").get(date);
  if (existing) {
    return res.status(400).json({ error: `Recording untuk tanggal ${date} sudah pernah dicatat. Silakan edit data yang ada.` });
  }

  const id = generateUUID();
  const now = getWITTimestamp();

  try {
    db.prepare(`
      INSERT INTO chicken_recordings (
        id, date, initial_population, chicken_in, chicken_dead, chicken_culled,
        final_population, eggs_produced, eggs_good, eggs_broken, feed_consumed_kg,
        vaccine_info, vitamin_info, notes, created_by, created_by_name,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `).run(
      id,
      date,
      popAwal,
      masuk,
      mati,
      afkir,
      popAkhir,
      prod,
      baik,
      rusak,
      feed,
      vaccine_info?.trim() || null,
      vitamin_info?.trim() || null,
      notes?.trim() || null,
      req.user.id,
      req.user.name,
      now,
      now
    );

    logAudit(
      'CREATE',
      'RECORDING',
      id,
      date,
      req.user.id,
      req.user.name,
      `Recording harian: ${date} (Pop. Akhir: ${popAkhir}, Telur: ${prod}, Mati: ${mati})`
    );

    const created = db.prepare('SELECT * FROM chicken_recordings WHERE id = ?').get(id);
    res.status(201).json({ message: 'Recording peternakan berhasil disimpan.', recording: created });
  } catch (err) {
    console.error('Error saving recording:', err);
    res.status(500).json({ error: 'Gagal menyimpan recording: ' + err.message });
  }
});

// PUT /api/recordings/:id
router.put('/:id', authenticateToken, (req, res) => {
  const rec = db.prepare('SELECT * FROM chicken_recordings WHERE id = ?').get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Data recording tidak ditemukan.' });
  if (rec.status === 'VOID') return res.status(400).json({ error: 'Recording yang telah dibatalkan tidak dapat diedit.' });

  const {
    date,
    initial_population,
    chicken_in = 0,
    chicken_dead = 0,
    chicken_culled = 0,
    eggs_produced = 0,
    eggs_good = 0,
    eggs_broken = 0,
    feed_consumed_kg = 0,
    vaccine_info,
    vitamin_info,
    notes
  } = req.body;

  if (!date) return res.status(400).json({ error: 'Tanggal recording wajib diisi.' });
  const popAwal = parseInt(initial_population, 10);
  if (isNaN(popAwal) || popAwal <= 0) return res.status(400).json({ error: 'Populasi awal wajib lebih dari 0 ekor.' });

  const masuk = parseInt(chicken_in, 10) || 0;
  const mati = parseInt(chicken_dead, 10) || 0;
  const afkir = parseInt(chicken_culled, 10) || 0;
  const totalTersedia = popAwal + masuk;

  if (mati + afkir > totalTersedia) {
    return res.status(400).json({
      error: `Jumlah ayam mati (${mati}) dan afkir (${afkir}) melebihi total ayam yang tersedia (${totalTersedia} ekor).`
    });
  }

  const popAkhir = popAwal + masuk - mati - afkir;
  const prod = parseInt(eggs_produced, 10) || 0;
  let baik = parseInt(eggs_good, 10) || 0;
  const rusak = parseInt(eggs_broken, 10) || 0;

  if (baik === 0 && prod > 0 && rusak === 0) baik = prod;
  else if (baik + rusak !== prod && prod > 0) baik = Math.max(0, prod - rusak);

  const feed = parseFloat(feed_consumed_kg) || 0;
  const now = getWITTimestamp();

  try {
    db.prepare(`
      UPDATE chicken_recordings
      SET date = ?, initial_population = ?, chicken_in = ?, chicken_dead = ?, chicken_culled = ?,
          final_population = ?, eggs_produced = ?, eggs_good = ?, eggs_broken = ?, feed_consumed_kg = ?,
          vaccine_info = ?, vitamin_info = ?, notes = ?, updated_by = ?, updated_by_name = ?, updated_at = ?
      WHERE id = ?
    `).run(
      date,
      popAwal,
      masuk,
      mati,
      afkir,
      popAkhir,
      prod,
      baik,
      rusak,
      feed,
      vaccine_info?.trim() || null,
      vitamin_info?.trim() || null,
      notes?.trim() || null,
      req.user.id,
      req.user.name,
      now,
      rec.id
    );

    logAudit('UPDATE', 'RECORDING', rec.id, date, req.user.id, req.user.name, `Memperbarui recording ${date}`);

    const updated = db.prepare('SELECT * FROM chicken_recordings WHERE id = ?').get(rec.id);
    res.json({ message: 'Recording berhasil diperbarui.', recording: updated });
  } catch (err) {
    console.error('Error updating recording:', err);
    res.status(500).json({ error: 'Gagal memperbarui recording: ' + err.message });
  }
});

// POST /api/recordings/:id/void
router.post('/:id/void', authenticateToken, (req, res) => {
  const { reason } = req.body;
  const rec = db.prepare('SELECT * FROM chicken_recordings WHERE id = ?').get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Recording tidak ditemukan.' });
  if (rec.status === 'VOID') return res.status(400).json({ error: 'Data ini sudah berstatus VOID.' });

  const now = getWITTimestamp();

  try {
    db.prepare(`
      UPDATE chicken_recordings
      SET status = 'VOID', updated_by = ?, updated_by_name = ?, updated_at = ?
      WHERE id = ?
    `).run(req.user.id, req.user.name, now, rec.id);

    logAudit('VOID', 'RECORDING', rec.id, rec.date, req.user.id, req.user.name, `Membatalkan (VOID) recording ${rec.date}. Alasan: ${reason || '-'}`);

    res.json({ message: `Recording ${rec.date} berhasil dibatalkan (VOID).` });
  } catch (err) {
    console.error('Error voiding recording:', err);
    res.status(500).json({ error: 'Gagal membatalkan recording: ' + err.message });
  }
});

export default router;
