import { db, transaction, generateUUID, getWITTimestamp, logAudit } from './db.js';

export function seedDemoData(actorUser = null) {
  const userId = actorUser?.id || 'system-seed';
  const userName = actorUser?.name || 'System Seeder';

  transaction(() => {
    // 1. Reset all operational and transactional data
    db.exec(`
      DELETE FROM sales;
      DELETE FROM expenses;
      DELETE FROM income;
      DELETE FROM cash_transactions;
      DELETE FROM chicken_recordings;
      DELETE FROM audit_logs;
    `);

    // Reset initial balance on business profile
    db.prepare(`
      UPDATE business_profile
      SET initial_balance = 5000000,
          name = 'BUMKam KOYABHU',
          unit_name = 'Unit Usaha Peternakan Ayam Petelur',
          address = 'Jl. Poros Koyabhu',
          kampung = 'Koyabhu',
          distrik = 'Sentani Timur',
          kabupaten = 'Kabupaten Jayapura',
          provinsi = 'Papua',
          phone = '0812-3456-7890',
          email = 'koyabhu.bumkam@gmail.com',
          logo_url = '/logo.svg'
      WHERE id = 1
    `).run();

    // 2. Prepare past 14 days of realistic chicken farm operations
    const today = new Date();
    let currentPop = 1200; // Starting population 14 days ago

    const recordings = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const initialPop = currentPop;
      // Chicken dead: 0 to 3 chickens
      const dead = i === 4 ? 3 : (i % 3 === 0 ? 2 : (i % 2 === 0 ? 1 : 0));
      // Chicken culled (afkir): rare, e.g. 1 on day 8
      const culled = i === 8 ? 2 : 0;
      const masuk = i === 12 ? 20 : 0; // 20 pullet masuk on day 12

      currentPop = initialPop + masuk - dead - culled;

      // Egg production: 880 - 960 eggs/day
      const baseEggs = 910 + ((i * 17) % 50) - 25;
      const broken = (i % 4 === 0) ? 8 : (i % 3 === 0 ? 5 : 3);
      const good = baseEggs - broken;

      // Feed: ~110-125 kg/day (approx 100-110g per hen)
      const feedKg = 115 + (i % 5);

      const vaccine = i === 10 ? 'Vaksin ND-IB Booster' : null;
      const vitamin = (i % 3 === 0) ? 'Vita Stress & Egg Stimulant' : (i % 2 === 0 ? 'Aminovitas' : null);

      recordings.push({
        id: generateUUID(),
        date: dateStr,
        initial_population: initialPop,
        chicken_in: masuk,
        chicken_dead: dead,
        chicken_culled: culled,
        final_population: currentPop,
        eggs_produced: baseEggs,
        eggs_good: good,
        eggs_broken: broken,
        feed_consumed_kg: feedKg,
        vaccine_info: vaccine,
        vitamin_info: vitamin,
        notes: i === 0 ? 'Kondisi ayam sehat, produksi stabil.' : 'Pencatatan rutin kandang layer.'
      });
    }

    // Insert recordings
    const insertRec = db.prepare(`
      INSERT INTO chicken_recordings (
        id, date, initial_population, chicken_in, chicken_dead, chicken_culled,
        final_population, eggs_produced, eggs_good, eggs_broken, feed_consumed_kg,
        vaccine_info, vitamin_info, notes, created_by, created_by_name,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `);

    for (const rec of recordings) {
      const ts = `${rec.date}T07:30:00.000Z`;
      insertRec.run(
        rec.id, rec.date, rec.initial_population, rec.chicken_in, rec.chicken_dead, rec.chicken_culled,
        rec.final_population, rec.eggs_produced, rec.eggs_good, rec.eggs_broken, rec.feed_consumed_kg,
        rec.vaccine_info, rec.vitamin_info, rec.notes, userId, userName, ts, ts
      );
    }

    // 3. Sales Demo Data (matching prototype customer names and realistic numbers)
    const buyers = [
      { name: 'Toko Sentosa Reseli', qty: 200, unit: 'butir', price: 2000, method: 'Tunai', status: 'Lunas' },
      { name: 'Warung Bu Sri', qty: 150, unit: 'butir', price: 2000, method: 'Tunai', status: 'Lunas' },
      { name: 'Pasar Sentani', qty: 300, unit: 'butir', price: 2000, method: 'Transfer', status: 'Lunas' },
      { name: 'Koperasi Kampung', qty: 250, unit: 'butir', price: 2000, method: 'Tunai', status: 'Lunas' },
      { name: 'Toko Berkah', qty: 180, unit: 'butir', price: 2000, method: 'Transfer', status: 'Lunas' },
      { name: 'Masyarakat Kampung Koyabhu', qty: 60, unit: 'butir', price: 2200, method: 'Tunai', status: 'Lunas' },
      { name: 'Resto Danau Sentani', qty: 15, unit: 'rak', price: 60000, method: 'Transfer', status: 'Belum Lunas' },
      { name: 'Katering Mama Papua', qty: 10, unit: 'rak', price: 60000, method: 'Tunai', status: 'Lunas' },
      { name: 'Kios Murah Koyabhu', qty: 120, unit: 'butir', price: 2000, method: 'Tunai', status: 'Lunas' },
      { name: 'Pelanggan Tetap Sentani', qty: 8, unit: 'rak', price: 60000, method: 'Transfer', status: 'Lunas' },
      { name: 'Toko Berkah', qty: 200, unit: 'butir', price: 2000, method: 'Tunai', status: 'Lunas' },
      { name: 'Warung Makan Cenderawasih', qty: 150, unit: 'butir', price: 2000, method: 'Tunai', status: 'Belum Lunas' }
    ];

    const insertSale = db.prepare(`
      INSERT INTO sales (
        id, invoice_number, date, customer_name, quantity, unit, eggs_count,
        unit_price, total_amount, payment_method, payment_status, payment_date,
        notes, created_by, created_by_name, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `);

    const insertCash = db.prepare(`
      INSERT INTO cash_transactions (
        id, date, transaction_number, type, category, description,
        amount, reference_type, reference_id, created_by, created_by_name,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `);

    let saleSeq = 1;
    buyers.forEach((b, idx) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (idx % 12));
      const dateStr = d.toISOString().split('T')[0];

      const ym = dateStr.slice(0, 7).replace('-', '');
      const invNum = `PJL-${ym}-${String(saleSeq++).padStart(4, '0')}`;
      const totalAmount = b.qty * b.price;
      const eggsCount = b.unit === 'rak' ? b.qty * 30 : b.qty;
      const saleId = generateUUID();
      const ts = `${dateStr}T09:00:00.000Z`;
      const payDate = b.status === 'Lunas' ? dateStr : null;

      insertSale.run(
        saleId, invNum, dateStr, b.name, b.qty, b.unit, eggsCount,
        b.price, totalAmount, b.method, b.status, payDate,
        'Penjualan telur segar BUMKam', userId, userName, ts, ts
      );

      // Auto cash transaction if Lunas
      if (b.status === 'Lunas') {
        insertCash.run(
          generateUUID(),
          dateStr,
          invNum,
          'IN',
          'Penjualan Telur',
          `Penjualan telur ke ${b.name} (${b.qty} ${b.unit})`,
          totalAmount,
          'SALE',
          saleId,
          userId,
          userName,
          ts
        );
      }
    });

    // 4. Operational Expenses Demo Data (matching prototype)
    const expensesList = [
      { dayOffset: 12, cat: 'Pakan', desc: 'Pembelian Pakan Ayam Layer Konsentrat (10 Karung)', amt: 3050000, method: 'Transfer' },
      { dayOffset: 10, cat: 'Vitamin/Obat', desc: 'Vitamin Vita Stress & Egg Stimulant', amt: 750000, method: 'Tunai' },
      { dayOffset: 8, cat: 'Vaksin', desc: 'Vaksin ND-IB & Aqua Destilasi', amt: 500000, method: 'Tunai' },
      { dayOffset: 7, cat: 'Pemeliharaan Kandang', desc: 'Desinfeksi, Sekam Padi & Pembersihan Kandang', amt: 1350000, method: 'Tunai' },
      { dayOffset: 5, cat: 'Transportasi', desc: 'BBM Pengiriman Telur Pasar & Toko Sentani', amt: 300000, method: 'Tunai' },
      { dayOffset: 4, cat: 'Pakan', desc: 'Pakan Jagung Giling & Dedak Padi Halus (8 Karung)', amt: 2200000, method: 'Transfer' },
      { dayOffset: 3, cat: 'Listrik/Air', desc: 'Pembayaran Listrik PLN Kandang & Pompa Air Otomatis', amt: 450000, method: 'Transfer' },
      { dayOffset: 2, cat: 'Peralatan', desc: 'Tempat Minum Bell Nipple & Egg Tray Plastik Baru', amt: 650000, method: 'Tunai' },
      { dayOffset: 1, cat: 'Tenaga Kerja', desc: 'Upah Pengelola Kebersihan & Panen Harian', amt: 1200000, method: 'Tunai' }
    ];

    const insertExp = db.prepare(`
      INSERT INTO expenses (
        id, expense_number, date, category, description, amount,
        payment_method, proof_file, created_by, created_by_name,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `);

    let expSeq = 1;
    expensesList.forEach(exp => {
      const d = new Date(today);
      d.setDate(d.getDate() - exp.dayOffset);
      const dateStr = d.toISOString().split('T')[0];

      const ym = dateStr.slice(0, 7).replace('-', '');
      const expNum = `PNG-${ym}-${String(expSeq++).padStart(4, '0')}`;
      const expId = generateUUID();
      const ts = `${dateStr}T11:00:00.000Z`;

      insertExp.run(
        expId, expNum, dateStr, exp.cat, exp.desc, exp.amt,
        exp.method, null, userId, userName, ts, ts
      );

      insertCash.run(
        generateUUID(),
        dateStr,
        expNum,
        'OUT',
        exp.cat,
        exp.desc,
        exp.amt,
        'EXPENSE',
        expId,
        userId,
        userName,
        ts
      );
    });

    // 5. Other Income Demo Data
    const incomeList = [
      { dayOffset: 11, source: 'Dinas Peternakan', cat: 'Bantuan', desc: 'Subsidi Sarana Prasarana BUMKam', amt: 2500000, method: 'Transfer' },
      { dayOffset: 7, source: 'Petani Kebun Sayur', cat: 'Penjualan kotoran/pupuk', desc: 'Penjualan 40 Karung Pupuk Kandang Kotoran Ayam Kering', amt: 600000, method: 'Tunai' },
      { dayOffset: 3, source: 'Warga Sentani', cat: 'Penjualan ayam afkir', desc: 'Penjualan 5 Ekor Ayam Afkir Seleksi', amt: 350000, method: 'Tunai' }
    ];

    const insertInc = db.prepare(`
      INSERT INTO income (
        id, income_number, date, source, category, amount,
        payment_method, notes, proof_file, created_by, created_by_name,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `);

    let incSeq = 1;
    incomeList.forEach(inc => {
      const d = new Date(today);
      d.setDate(d.getDate() - inc.dayOffset);
      const dateStr = d.toISOString().split('T')[0];

      const ym = dateStr.slice(0, 7).replace('-', '');
      const incNum = `PMK-${ym}-${String(incSeq++).padStart(4, '0')}`;
      const incId = generateUUID();
      const ts = `${dateStr}T14:00:00.000Z`;

      insertInc.run(
        incId, incNum, dateStr, inc.source, inc.cat, inc.amt,
        inc.method, inc.desc, null, userId, userName, ts, ts
      );

      insertCash.run(
        generateUUID(),
        dateStr,
        incNum,
        'IN',
        inc.cat,
        `${inc.source} - ${inc.desc}`,
        inc.amt,
        'OTHER_INCOME',
        incId,
        userId,
        userName,
        ts
      );
    });

    // Audit Log for Demo Data
    logAudit('SEED', 'SYSTEM', null, null, userId, userName, 'Memuat ulang data demo peternakan ayam & keuangan BUMKam');
  });
}
