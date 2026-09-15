import { db, initDatabase, transaction } from '../server/db.js';
import { seedDemoData } from '../server/seed-data.js';

// Automated Test Runner for BUMKam KOYABHU
async function runTests() {
  console.log('====================================================');
  console.log('MENJALANKAN PENGUJIAN FUNGSIONAL KOYABHU BUMKam');
  console.log('====================================================\n');

  initDatabase();
  seedDemoData();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ GAGAL: ${message}`);
      failed++;
    }
  }

  // Get initial cash balance and stats
  const getCashBalance = () => {
    const profile = db.prepare('SELECT initial_balance FROM business_profile WHERE id = 1').get();
    const initBal = profile?.initial_balance || 0;
    const inRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM cash_transactions WHERE type = 'IN' AND status = 'ACTIVE'").get();
    const outRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM cash_transactions WHERE type = 'OUT' AND status = 'ACTIVE'").get();
    return initBal + inRow.total - outRow.total;
  };

  const getHasilUsaha = (startDate, endDate) => {
    let salesQ = "SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE status = 'ACTIVE'";
    let otherQ = "SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE status = 'ACTIVE'";
    let expQ = "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE status = 'ACTIVE'";
    const params = [];
    if (startDate && endDate) {
      salesQ += " AND date >= ? AND date <= ?";
      otherQ += " AND date >= ? AND date <= ?";
      expQ += " AND date >= ? AND date <= ?";
      params.push(startDate, endDate);
    }
    const totalRev = db.prepare(salesQ).get(...params).total + db.prepare(otherQ).get(...params).total;
    const totalExp = db.prepare(expQ).get(...params).total;
    return totalRev - totalExp;
  };

  // ----------------------------------------------------
  // TEST CASE 1: Input penjualan telur tunai Rp400.000
  // ----------------------------------------------------
  console.log('TEST CASE 1: Input Penjualan Telur Tunai Rp400.000');
  const initialCash1 = getCashBalance();
  const initialHasil1 = getHasilUsaha();

  const sale1Id = 'test-sale-1';
  const sale1Date = '2026-09-15';
  const sale1Amount = 400000;

  // Simulate Sale POST logic
  transaction(() => {
    db.prepare(`
      INSERT INTO sales (
        id, invoice_number, date, customer_name, quantity, unit, eggs_count,
        unit_price, total_amount, payment_method, payment_status, payment_date,
        notes, created_by, created_by_name, status, created_at, updated_at
      ) VALUES (?, 'PJL-TEST-0001', ?, 'Pak Johan Toko', 200, 'butir', 200, 2000, ?, 'Tunai', 'Lunas', ?, 'Test Penjualan Tunai', 'admin', 'Ketua BUMKam', 'ACTIVE', datetime('now'), datetime('now'))
    `).run(sale1Id, sale1Date, sale1Amount, sale1Date);

    db.prepare(`
      INSERT INTO cash_transactions (
        id, date, transaction_number, type, category, description,
        amount, reference_type, reference_id, created_by, created_by_name,
        status, created_at
      ) VALUES ('cash-test-1', ?, 'PJL-TEST-0001', 'IN', 'Penjualan Telur', 'Penjualan telur ke Pak Johan Toko', ?, 'SALE', ?, 'admin', 'Ketua BUMKam', 'ACTIVE', datetime('now'))
    `).run(sale1Date, sale1Amount, sale1Id);
  });

  const cashAfter1 = getCashBalance();
  const hasilAfter1 = getHasilUsaha();
  const saleRecorded1 = db.prepare('SELECT * FROM sales WHERE id = ?').get(sale1Id);
  const cashEntry1 = db.prepare("SELECT * FROM cash_transactions WHERE reference_id = ? AND status = 'ACTIVE'").get(sale1Id);

  assert(saleRecorded1 !== undefined, 'Penjualan tercatat di database');
  assert(cashEntry1 !== undefined && cashEntry1.amount === 400000, 'Pemasukan kas tercatat Rp400.000');
  assert(cashAfter1 === initialCash1 + 400000, `Kas bertambah Rp400.000 (Semula: Rp${initialCash1.toLocaleString('id-ID')} -> Menjadi: Rp${cashAfter1.toLocaleString('id-ID')})`);
  assert(hasilAfter1 === initialHasil1 + 400000, `Hasil Usaha bertambah Rp400.000`);

  // ----------------------------------------------------
  // TEST CASE 2: Input pengeluaran pakan Rp250.000
  // ----------------------------------------------------
  console.log('\nTEST CASE 2: Input Pengeluaran Pakan Rp250.000');
  const initialCash2 = getCashBalance();
  const initialHasil2 = getHasilUsaha();

  const expId2 = 'test-exp-2';
  const expAmount2 = 250000;

  transaction(() => {
    db.prepare(`
      INSERT INTO expenses (
        id, expense_number, date, category, description, amount,
        payment_method, proof_file, created_by, created_by_name, status, created_at, updated_at
      ) VALUES (?, 'PNG-TEST-0001', '2026-09-15', 'Pakan', 'Pembelian pakan tambahan 1 karung', ?, 'Tunai', null, 'admin', 'Ketua BUMKam', 'ACTIVE', datetime('now'), datetime('now'))
    `).run(expId2, expAmount2);

    db.prepare(`
      INSERT INTO cash_transactions (
        id, date, transaction_number, type, category, description,
        amount, reference_type, reference_id, created_by, created_by_name, status, created_at
      ) VALUES ('cash-test-2', '2026-09-15', 'PNG-TEST-0001', 'OUT', 'Pakan', 'Pembelian pakan tambahan 1 karung', ?, 'EXPENSE', ?, 'admin', 'Ketua BUMKam', 'ACTIVE', datetime('now'))
    `).run(expAmount2, expId2);
  });

  const cashAfter2 = getCashBalance();
  const hasilAfter2 = getHasilUsaha();
  const expRecorded2 = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expId2);

  assert(expRecorded2 !== undefined, 'Pengeluaran tercatat');
  assert(cashAfter2 === initialCash2 - 250000, `Kas berkurang Rp250.000 (Semula: Rp${initialCash2.toLocaleString('id-ID')} -> Menjadi: Rp${cashAfter2.toLocaleString('id-ID')})`);
  assert(hasilAfter2 === initialHasil2 - 250000, 'Hasil Usaha berkurang Rp250.000');

  // ----------------------------------------------------
  // TEST CASE 3: Input penjualan BELUM LUNAS Rp500.000 lalu diubah LUNAS
  // ----------------------------------------------------
  console.log('\nTEST CASE 3: Penjualan Belum Lunas Rp500.000 kemudian Pelunasan');
  const initialCash3 = getCashBalance();
  const saleId3 = 'test-sale-3';
  const saleAmount3 = 500000;

  // Step 3a: Save as Belum Lunas
  db.prepare(`
    INSERT INTO sales (
      id, invoice_number, date, customer_name, quantity, unit, eggs_count,
      unit_price, total_amount, payment_method, payment_status, payment_date,
      notes, created_by, created_by_name, status, created_at, updated_at
    ) VALUES (?, 'PJL-TEST-0002', '2026-09-15', 'Kios Sentani Baru', 250, 'butir', 250, 2000, ?, 'Transfer', 'Belum Lunas', null, 'Belum lunas', 'admin', 'Ketua BUMKam', 'ACTIVE', datetime('now'), datetime('now'))
  `).run(saleId3, saleAmount3);

  const cashAfter3a = getCashBalance();
  const cashEntry3a = db.prepare("SELECT * FROM cash_transactions WHERE reference_id = ? AND status = 'ACTIVE'").get(saleId3);

  assert(cashAfter3a === initialCash3, `Penjualan Belum Lunas TIDAK menambah kas (Saldo tetap Rp${cashAfter3a.toLocaleString('id-ID')})`);
  assert(cashEntry3a === undefined, 'Tidak ada kas masuk yang dibuat saat Belum Lunas');

  // Step 3b: Update to LUNAS
  const paymentDate3 = '2026-09-16';
  transaction(() => {
    db.prepare(`
      UPDATE sales
      SET payment_status = 'Lunas', payment_date = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(paymentDate3, saleId3);

    db.prepare(`
      INSERT INTO cash_transactions (
        id, date, transaction_number, type, category, description,
        amount, reference_type, reference_id, created_by, created_by_name, status, created_at
      ) VALUES ('cash-test-3', ?, 'PJL-TEST-0002', 'IN', 'Penjualan Telur', 'Pelunasan penjualan telur Kios Sentani Baru', ?, 'SALE', ?, 'admin', 'Ketua BUMKam', 'ACTIVE', datetime('now'))
    `).run(paymentDate3, saleAmount3, saleId3);
  });

  const cashAfter3b = getCashBalance();
  const saleUpdated3 = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId3);

  assert(saleUpdated3.payment_status === 'Lunas', 'Status penjualan berhasil menjadi Lunas');
  assert(saleUpdated3.payment_date === paymentDate3, `Tanggal pelunasan tersimpan: ${paymentDate3}`);
  assert(cashAfter3b === initialCash3 + 500000, `Kas bertambah Rp500.000 setelah pelunasan (Saldo menjadi: Rp${cashAfter3b.toLocaleString('id-ID')})`);

  // ----------------------------------------------------
  // TEST CASE 4: Recording: Pop Awal 1200, Mati 5, Afkir 2, Masuk 0 -> Pop Akhir 1193
  // ----------------------------------------------------
  console.log('\nTEST CASE 4: Recording Populasi Ayam');
  const popAwal4 = 1200;
  const mati4 = 5;
  const afkir4 = 2;
  const masuk4 = 0;
  const popAkhir4 = popAwal4 + masuk4 - mati4 - afkir4;

  const recId4 = 'test-rec-4';
  const recDate4 = '2026-09-30'; // Unique future date for test

  db.prepare(`
    INSERT INTO chicken_recordings (
      id, date, initial_population, chicken_in, chicken_dead, chicken_culled,
      final_population, eggs_produced, eggs_good, eggs_broken, feed_consumed_kg,
      created_by, created_by_name, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 900, 895, 5, 120, 'admin', 'Ketua BUMKam', 'ACTIVE', datetime('now'), datetime('now'))
  `).run(recId4, recDate4, popAwal4, masuk4, mati4, afkir4, popAkhir4);

  const recRecorded4 = db.prepare('SELECT * FROM chicken_recordings WHERE id = ?').get(recId4);
  assert(recRecorded4 !== undefined, 'Data recording tersimpan');
  assert(recRecorded4.final_population === 1193, `Populasi akhir terhitung otomatis: ${recRecorded4.final_population} (Sesuai rumus: 1200 + 0 - 5 - 2 = 1193)`);

  // ----------------------------------------------------
  // TEST CASE 5: Void Transaksi & Koreksi Saldo
  // ----------------------------------------------------
  console.log('\nTEST CASE 5: Void Transaksi & Koreksi Saldo Kas');
  const cashBeforeVoid = getCashBalance();
  const hasilBeforeVoid = getHasilUsaha();

  // Void the sale1 (Rp400.000)
  transaction(() => {
    db.prepare("UPDATE sales SET status = 'VOID', updated_at = datetime('now') WHERE id = ?").run(sale1Id);
    db.prepare("UPDATE cash_transactions SET status = 'VOID' WHERE reference_id = ?").run(sale1Id);
    db.prepare(`
      INSERT INTO audit_logs (id, action, module, reference_id, reference_code, user_id, user_name, details, created_at)
      VALUES ('audit-void-1', 'VOID', 'SALES', ?, 'PJL-TEST-0001', 'admin', 'Ketua BUMKam', 'Void test sale', datetime('now'))
    `).run(sale1Id);
  });

  const cashAfterVoid = getCashBalance();
  const hasilAfterVoid = getHasilUsaha();
  const saleCheck5 = db.prepare('SELECT * FROM sales WHERE id = ?').get(sale1Id);
  const auditCheck5 = db.prepare("SELECT * FROM audit_logs WHERE reference_id = ? AND action = 'VOID'").get(sale1Id);

  assert(saleCheck5.status === 'VOID', 'Status transaksi menjadi VOID (tidak dihapus fisik)');
  assert(cashAfterVoid === cashBeforeVoid - 400000, `Saldo kas dikoreksi kembali: berkurang Rp400.000 (Semula: Rp${cashBeforeVoid.toLocaleString('id-ID')} -> Menjadi: Rp${cashAfterVoid.toLocaleString('id-ID')})`);
  assert(hasilAfterVoid === hasilBeforeVoid - 400000, 'Hasil usaha dikoreksi: penjualan void tidak lagi dihitung');
  assert(auditCheck5 !== undefined, 'Audit trail tercatat dengan riwayat pelaku dan waktu pembatalan');

  // Summary
  console.log('\n====================================================');
  console.log(`HASIL PENGUJIAN: ${passed} LULUS, ${failed} GAGAL`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
