import express from 'express';
import { db, transaction, generateUUID, getWITTimestamp, getWITDate, generateTransactionNumber, logAudit } from '../db.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// Restrict all sales management to ADMIN (Ketua BUMKam)
router.use(authenticateToken, requireRole('ADMIN'));

// GET /api/sales
router.get('/', (req, res) => {
  const { search, startDate, endDate, status, paymentStatus, page = 1, limit = 15 } = req.query;

  let query = `SELECT * FROM sales WHERE 1=1`;
  const params = [];

  if (search) {
    query += ` AND (invoice_number LIKE ? OR customer_name LIKE ? OR notes LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
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

  if (paymentStatus) {
    query += ` AND payment_status = ?`;
    params.push(paymentStatus);
  }

  // Count total
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const countResult = db.prepare(countQuery).get(...params);
  const total = countResult ? countResult.total : 0;

  // Pagination & Order
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

// GET /api/sales/:id
router.get('/:id', authenticateToken, (req, res) => {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) {
    return res.status(404).json({ error: 'Transaksi penjualan tidak ditemukan.' });
  }
  res.json({ sale });
});

// POST /api/sales
router.post('/', authenticateToken, (req, res) => {
  const {
    date,
    customer_name,
    quantity,
    unit = 'butir',
    unit_price,
    payment_method = 'Tunai',
    payment_status = 'Lunas',
    notes
  } = req.body;

  // Validations
  if (!date) {
    return res.status(400).json({ error: 'Tanggal penjualan wajib diisi.' });
  }
  if (!customer_name || !customer_name.trim()) {
    return res.status(400).json({ error: 'Nama pembeli / pelanggan wajib diisi.' });
  }
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Jumlah telur wajib lebih dari 0.' });
  }
  const price = parseFloat(unit_price);
  if (isNaN(price) || price < 0) {
    return res.status(400).json({ error: 'Harga satuan telur tidak boleh bernilai negatif.' });
  }

  const totalAmount = Math.round(qty * price);
  const normalizedEggsCount = unit.toLowerCase() === 'rak' ? Math.round(qty * 30) : Math.round(qty);
  const now = getWITTimestamp();
  const invoiceNumber = generateTransactionNumber('PJL', date);
  const saleId = generateUUID();
  const paymentDate = payment_status === 'Lunas' ? (date || getWITDate()) : null;

  try {
    transaction(() => {
      // 1. Insert into sales
      db.prepare(`
        INSERT INTO sales (
          id, invoice_number, date, customer_name, quantity, unit, eggs_count,
          unit_price, total_amount, payment_method, payment_status, payment_date,
          notes, created_by, created_by_name, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
      `).run(
        saleId,
        invoiceNumber,
        date,
        customer_name.trim(),
        qty,
        unit,
        normalizedEggsCount,
        price,
        totalAmount,
        payment_method,
        payment_status,
        paymentDate,
        notes?.trim() || null,
        req.user.id,
        req.user.name,
        now,
        now
      );

      // 2. If LUNAS: automatically create Cash Transaction
      if (payment_status === 'Lunas') {
        const cashId = generateUUID();
        db.prepare(`
          INSERT INTO cash_transactions (
            id, date, transaction_number, type, category, description,
            amount, reference_type, reference_id, created_by, created_by_name,
            status, created_at
          ) VALUES (?, ?, ?, 'IN', 'Penjualan Telur', ?, ?, 'SALE', ?, ?, ?, 'ACTIVE', ?)
        `).run(
          cashId,
          paymentDate,
          invoiceNumber,
          `Penjualan telur ke ${customer_name.trim()} (${qty} ${unit})`,
          totalAmount,
          saleId,
          req.user.id,
          req.user.name,
          now
        );
      }

      // 3. Audit Log
      logAudit(
        'CREATE',
        'SALES',
        saleId,
        invoiceNumber,
        req.user.id,
        req.user.name,
        `Penjualan telur baru: ${invoiceNumber} senilai Rp ${totalAmount.toLocaleString('id-ID')} (${payment_status})`
      );
    });

    const created = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    res.status(201).json({
      message: 'Transaksi penjualan berhasil disimpan.',
      sale: created
    });
  } catch (err) {
    console.error('Error saving sale:', err);
    res.status(500).json({ error: 'Gagal menyimpan transaksi penjualan: ' + err.message });
  }
});

// PUT /api/sales/:id
router.put('/:id', authenticateToken, (req, res) => {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) {
    return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
  }
  if (sale.status === 'VOID') {
    return res.status(400).json({ error: 'Transaksi yang telah dibatalkan (VOID) tidak dapat diubah.' });
  }

  const {
    date,
    customer_name,
    quantity,
    unit = 'butir',
    unit_price,
    payment_method,
    payment_status,
    notes
  } = req.body;

  if (!date) return res.status(400).json({ error: 'Tanggal penjualan wajib diisi.' });
  if (!customer_name?.trim()) return res.status(400).json({ error: 'Nama pembeli wajib diisi.' });
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Jumlah telur wajib lebih dari 0.' });
  const price = parseFloat(unit_price);
  if (isNaN(price) || price < 0) return res.status(400).json({ error: 'Harga satuan tidak boleh negatif.' });

  const totalAmount = Math.round(qty * price);
  const normalizedEggsCount = unit.toLowerCase() === 'rak' ? Math.round(qty * 30) : Math.round(qty);
  const now = getWITTimestamp();

  try {
    transaction(() => {
      const wasLunas = sale.payment_status === 'Lunas';
      const isNowLunas = payment_status === 'Lunas';
      const paymentDate = isNowLunas ? (sale.payment_date || date || getWITDate()) : null;

      // Update sale
      db.prepare(`
        UPDATE sales
        SET date = ?, customer_name = ?, quantity = ?, unit = ?, eggs_count = ?,
            unit_price = ?, total_amount = ?, payment_method = ?, payment_status = ?,
            payment_date = ?, notes = ?, updated_by = ?, updated_by_name = ?, updated_at = ?
        WHERE id = ?
      `).run(
        date,
        customer_name.trim(),
        qty,
        unit,
        normalizedEggsCount,
        price,
        totalAmount,
        payment_method,
        payment_status,
        paymentDate,
        notes?.trim() || null,
        req.user.id,
        req.user.name,
        now,
        sale.id
      );

      // Handle Cash Book synchronization
      if (!wasLunas && isNowLunas) {
        // Newly marked as Lunas: create cash transaction
        const cashId = generateUUID();
        db.prepare(`
          INSERT INTO cash_transactions (
            id, date, transaction_number, type, category, description,
            amount, reference_type, reference_id, created_by, created_by_name,
            status, created_at
          ) VALUES (?, ?, ?, 'IN', 'Penjualan Telur', ?, ?, 'SALE', ?, ?, ?, 'ACTIVE', ?)
        `).run(
          cashId,
          paymentDate,
          sale.invoice_number,
          `Penjualan telur ke ${customer_name.trim()} (${qty} ${unit}) - Pelunasan`,
          totalAmount,
          sale.id,
          req.user.id,
          req.user.name,
          now
        );
      } else if (wasLunas && !isNowLunas) {
        // Changed from Lunas to Belum Lunas: void existing cash transaction
        db.prepare(`
          UPDATE cash_transactions
          SET status = 'VOID'
          WHERE reference_id = ? AND reference_type = 'SALE' AND status = 'ACTIVE'
        `).run(sale.id);
      } else if (wasLunas && isNowLunas) {
        // Remained Lunas: update cash amount and description
        db.prepare(`
          UPDATE cash_transactions
          SET amount = ?, date = ?, description = ?
          WHERE reference_id = ? AND reference_type = 'SALE' AND status = 'ACTIVE'
        `).run(
          totalAmount,
          paymentDate,
          `Penjualan telur ke ${customer_name.trim()} (${qty} ${unit})`,
          sale.id
        );
      }

      logAudit(
        'UPDATE',
        'SALES',
        sale.id,
        sale.invoice_number,
        req.user.id,
        req.user.name,
        `Memperbarui transaksi ${sale.invoice_number}`
      );
    });

    const updated = db.prepare('SELECT * FROM sales WHERE id = ?').get(sale.id);
    res.json({ message: 'Transaksi penjualan berhasil diperbarui.', sale: updated });
  } catch (err) {
    console.error('Error updating sale:', err);
    res.status(500).json({ error: 'Gagal memperbarui transaksi: ' + err.message });
  }
});

// POST /api/sales/:id/void
router.post('/:id/void', authenticateToken, (req, res) => {
  const { reason } = req.body;
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) {
    return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
  }
  if (sale.status === 'VOID') {
    return res.status(400).json({ error: 'Transaksi ini sudah berstatus VOID sebelumnya.' });
  }

  const now = getWITTimestamp();

  try {
    transaction(() => {
      // 1. Mark sale as VOID
      db.prepare(`
        UPDATE sales
        SET status = 'VOID', updated_by = ?, updated_by_name = ?, updated_at = ?, notes = notes || ?
        WHERE id = ?
      `).run(
        req.user.id,
        req.user.name,
        now,
        reason ? ` [VOID: ${reason}]` : ' [VOID]',
        sale.id
      );

      // 2. Void linked cash transaction
      db.prepare(`
        UPDATE cash_transactions
        SET status = 'VOID'
        WHERE reference_id = ? AND reference_type = 'SALE'
      `).run(sale.id);

      // 3. Log Audit
      logAudit(
        'VOID',
        'SALES',
        sale.id,
        sale.invoice_number,
        req.user.id,
        req.user.name,
        `Membatalkan (VOID) transaksi penjualan ${sale.invoice_number}. Alasan: ${reason || 'Tanpa keterangan'}`
      );
    });

    res.json({ message: `Transaksi ${sale.invoice_number} berhasil dibatalkan (VOID).` });
  } catch (err) {
    console.error('Error voiding sale:', err);
    res.status(500).json({ error: 'Gagal membatalkan transaksi: ' + err.message });
  }
});

export default router;
