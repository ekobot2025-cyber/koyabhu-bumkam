import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = Boolean(process.env.VERCEL);
const rootDbPath = path.join(__dirname, '..', 'koyabhu.sqlite');
const DB_PATH = isVercel ? path.join('/tmp', 'koyabhu.sqlite') : rootDbPath;

if (isVercel && !fs.existsSync(DB_PATH)) {
  try {
    if (fs.existsSync(rootDbPath)) {
      fs.copyFileSync(rootDbPath, DB_PATH);
    }
  } catch (err) {
    console.error('Failed to copy initial sqlite template to /tmp:', err);
  }
}

export const db = new DatabaseSync(DB_PATH);

// Enable WAL and Foreign Keys
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
`);

export function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const res = fn();
    db.exec('COMMIT');
    return res;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function generateUUID() {
  return crypto.randomUUID();
}

export function getWITTimestamp() {
  // Current ISO timestamp
  return new Date().toISOString();
}

export function getWITDate() {
  // Format YYYY-MM-DD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function logAudit(action, module, referenceId, referenceCode, userId, userName, details) {
  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, action, module, reference_id, reference_code, user_id, user_name, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    generateUUID(),
    action,
    module,
    referenceId || null,
    referenceCode || null,
    userId || null,
    userName || 'System',
    typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
    getWITTimestamp()
  );
}

export function generateTransactionNumber(prefix, dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const ymPrefix = `${prefix}-${year}${month}`;

  let query = '';
  if (prefix === 'PJL') {
    query = `SELECT invoice_number AS code FROM sales WHERE invoice_number LIKE '${ymPrefix}-%' ORDER BY invoice_number DESC LIMIT 1`;
  } else if (prefix === 'PNG') {
    query = `SELECT expense_number AS code FROM expenses WHERE expense_number LIKE '${ymPrefix}-%' ORDER BY expense_number DESC LIMIT 1`;
  } else if (prefix === 'PMK') {
    query = `SELECT income_number AS code FROM income WHERE income_number LIKE '${ymPrefix}-%' ORDER BY income_number DESC LIMIT 1`;
  } else {
    query = `SELECT transaction_number AS code FROM cash_transactions WHERE transaction_number LIKE '${ymPrefix}-%' ORDER BY transaction_number DESC LIMIT 1`;
  }

  const lastRow = db.prepare(query).get();
  let nextSeq = 1;
  if (lastRow && lastRow.code) {
    const parts = lastRow.code.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  return `${ymPrefix}-${String(nextSeq).padStart(4, '0')}`;
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'PETUGAS',
      jabatan TEXT NOT NULL DEFAULT 'Petugas Operasional',
      email TEXT,
      phone TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS business_profile (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'BUMKam KOYABHU',
      unit_name TEXT NOT NULL DEFAULT 'Unit Usaha Peternakan Ayam Petelur',
      address TEXT DEFAULT 'Jl. Poros Koyabhu',
      kampung TEXT DEFAULT 'Koyabhu',
      distrik TEXT DEFAULT 'Sentani Timur',
      kabupaten TEXT DEFAULT 'Jayapura',
      provinsi TEXT DEFAULT 'Papua',
      phone TEXT DEFAULT '0812-3456-7890',
      email TEXT DEFAULT 'koyabhu.bumkam@gmail.com',
      logo_url TEXT DEFAULT '/logo.svg',
      initial_balance REAL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      is_default INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'butir',
      eggs_count INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Tunai',
      payment_status TEXT NOT NULL DEFAULT 'Lunas',
      payment_date TEXT,
      notes TEXT,
      workflow_status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'DIKIRIM', 'DIVERIFIKASI', 'DIKUNCI'
      verified_by TEXT,
      verified_at TEXT,
      locked_by TEXT,
      locked_at TEXT,
      created_by TEXT NOT NULL,
      created_by_name TEXT,
      updated_by TEXT,
      updated_by_name TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      expense_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Tunai',
      proof_file TEXT,
      created_by TEXT NOT NULL,
      created_by_name TEXT,
      updated_by TEXT,
      updated_by_name TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY,
      income_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      source TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Tunai',
      notes TEXT,
      proof_file TEXT,
      created_by TEXT NOT NULL,
      created_by_name TEXT,
      updated_by TEXT,
      updated_by_name TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      transaction_number TEXT NOT NULL,
      type TEXT NOT NULL, -- 'IN' or 'OUT'
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      reference_type TEXT NOT NULL, -- 'SALE', 'EXPENSE', 'OTHER_INCOME', 'MANUAL'
      reference_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_by_name TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'VOID'
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chicken_recordings (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      initial_population INTEGER NOT NULL,
      chicken_in INTEGER NOT NULL DEFAULT 0,
      chicken_dead INTEGER NOT NULL DEFAULT 0,
      chicken_culled INTEGER NOT NULL DEFAULT 0,
      final_population INTEGER NOT NULL,
      eggs_produced INTEGER NOT NULL DEFAULT 0,
      eggs_good INTEGER NOT NULL DEFAULT 0,
      eggs_broken INTEGER NOT NULL DEFAULT 0,
      feed_consumed_kg REAL NOT NULL DEFAULT 0,
      vaccine_info TEXT,
      vitamin_info TEXT,
      notes TEXT,
      workflow_status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'DIKIRIM', 'DIVERIFIKASI', 'DIKUNCI'
      verified_by TEXT,
      verified_at TEXT,
      locked_by TEXT,
      locked_at TEXT,
      created_by TEXT NOT NULL,
      created_by_name TEXT,
      updated_by TEXT,
      updated_by_name TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      reference_id TEXT,
      reference_code TEXT,
      user_id TEXT,
      user_name TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Safe column migrations for existing databases
  try {
    const salesCols = db.prepare("PRAGMA table_info(sales)").all().map(c => c.name);
    if (!salesCols.includes('workflow_status')) {
      db.exec("ALTER TABLE sales ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'DIVERIFIKASI'");
      db.exec("ALTER TABLE sales ADD COLUMN verified_by TEXT");
      db.exec("ALTER TABLE sales ADD COLUMN verified_at TEXT");
      db.exec("ALTER TABLE sales ADD COLUMN locked_by TEXT");
      db.exec("ALTER TABLE sales ADD COLUMN locked_at TEXT");
    }

    const recCols = db.prepare("PRAGMA table_info(chicken_recordings)").all().map(c => c.name);
    if (!recCols.includes('workflow_status')) {
      db.exec("ALTER TABLE chicken_recordings ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'DIVERIFIKASI'");
      db.exec("ALTER TABLE chicken_recordings ADD COLUMN verified_by TEXT");
      db.exec("ALTER TABLE chicken_recordings ADD COLUMN verified_at TEXT");
      db.exec("ALTER TABLE chicken_recordings ADD COLUMN locked_by TEXT");
      db.exec("ALTER TABLE chicken_recordings ADD COLUMN locked_at TEXT");
    }
  } catch (migErr) {
    console.warn('Migration warning:', migErr.message);
  }

  // Initialize Business Profile if empty
  const profileCount = db.prepare('SELECT COUNT(*) as cnt FROM business_profile').get();
  if (!profileCount || profileCount.cnt === 0) {
    db.prepare(`
      INSERT INTO business_profile (id, name, unit_name, address, kampung, distrik, kabupaten, provinsi, phone, email, logo_url, initial_balance, updated_at)
      VALUES (1, 'BUMKam KOYABHU', 'Unit Usaha Peternakan Ayam Petelur', 'Jl. Poros Koyabhu', 'Koyabhu', 'Sentani Timur', 'Kabupaten Jayapura', 'Papua', '0812-3456-7890', 'koyabhu.bumkam@gmail.com', '/logo.svg', 0, ?)
    `).run(getWITTimestamp());
  }

  // Initialize Default Categories
  const defaultCategories = [
    'Pakan',
    'Vaksin',
    'Vitamin/Obat',
    'Pemeliharaan Kandang',
    'Transportasi',
    'Listrik/Air',
    'Tenaga Kerja',
    'Peralatan',
    'Administrasi',
    'Lainnya'
  ];

  const catCount = db.prepare('SELECT COUNT(*) as cnt FROM expense_categories').get();
  if (!catCount || catCount.cnt === 0) {
    const insertCat = db.prepare('INSERT INTO expense_categories (id, name, is_default) VALUES (?, ?, 1)');
    for (const cat of defaultCategories) {
      insertCat.run(generateUUID(), cat);
    }
  }

  // Initialize / Sync Default Users for the 3 RBAC Roles
  const ensureUser = (username, password, name, role, jabatan, email, phone) => {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    const hash = bcrypt.hashSync(password, 10);
    const now = getWITTimestamp();
    if (!existing) {
      db.prepare(`
        INSERT INTO users (id, username, password_hash, name, role, jabatan, email, phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(generateUUID(), username, hash, name, role, jabatan, email, phone, now, now);
    } else {
      db.prepare(`
        UPDATE users SET role = ?, jabatan = ?, name = ?, updated_at = ? WHERE username = ?
      `).run(role, jabatan, name, now, username);
    }
  };

  ensureUser('admin', 'admin123', 'Ketua BUMKam', 'ADMIN', 'Ketua BUMKam KOYABHU', 'ketua@bumkamkoyabhu.id', '0812-3456-7890');
  ensureUser('petugas', 'petugas123', 'Petugas Kandang', 'PETUGAS_KANDANG', 'Pengelola Operasional Kandang', 'petugas@bumkamkoyabhu.id', '0821-9876-5432');
  ensureUser('kandang', 'kandang123', 'Petugas Kandang', 'PETUGAS_KANDANG', 'Pengelola Operasional Kandang', 'kandang@bumkamkoyabhu.id', '0821-9876-5432');
  ensureUser('penjualan', 'penjualan123', 'Petugas Penjualan', 'PETUGAS_PENJUALAN', 'Pengelola Penjualan Telur Harian', 'penjualan@bumkamkoyabhu.id', '0813-5555-8899');
}
