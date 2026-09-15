import express from 'express';
import bcrypt from 'bcryptjs';
import { db, generateUUID, getWITTimestamp, logAudit } from '../db.js';
import { signToken, authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan kata sandi wajib diisi.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user) {
    return res.status(401).json({ error: 'Username atau kata sandi tidak sesuai.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Username atau kata sandi tidak sesuai.' });
  }

  const token = signToken(user);

  logAudit('LOGIN', 'AUTH', user.id, null, user.id, user.name, `Pengguna ${user.username} berhasil login`);

  return res.json({
    message: 'Login berhasil.',
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      jabatan: user.jabatan,
      email: user.email,
      phone: user.phone
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, (req, res) => {
  const { name, jabatan, email, phone } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nama pengguna wajib diisi.' });
  }

  const now = getWITTimestamp();
  db.prepare(`
    UPDATE users
    SET name = ?, jabatan = ?, email = ?, phone = ?, updated_at = ?
    WHERE id = ?
  `).run(name.trim(), jabatan?.trim() || '', email?.trim() || '', phone?.trim() || '', now, req.user.id);

  logAudit('UPDATE', 'AUTH', req.user.id, null, req.user.id, req.user.name, 'Memperbarui profil pengguna');

  const updated = db.prepare('SELECT id, username, name, role, jabatan, email, phone FROM users WHERE id = ?').get(req.user.id);
  res.json({ message: 'Profil berhasil diperbarui.', user: updated });
});

// PUT /api/auth/password
router.put('/password', authenticateToken, (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Kata sandi lama dan baru wajib diisi.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Kata sandi baru minimal harus 6 karakter.' });
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Konfirmasi kata sandi tidak cocok.' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Kata sandi saat ini tidak tepat.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  const now = getWITTimestamp();

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, req.user.id);

  logAudit('UPDATE', 'AUTH', req.user.id, null, req.user.id, req.user.name, 'Mengubah kata sandi akun');

  res.json({ message: 'Kata sandi berhasil diperbarui.' });
});

// GET /api/auth/users (Admin only)
router.get('/users', authenticateToken, requireRole('ADMIN'), (req, res) => {
  const users = db.prepare('SELECT id, username, name, role, jabatan, email, phone, created_at FROM users ORDER BY created_at ASC').all();
  res.json({ users });
});

// POST /api/auth/users (Admin only)
router.post('/users', authenticateToken, requireRole('ADMIN'), (req, res) => {
  const { username, password, name, role, jabatan, email, phone } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Username, kata sandi, dan nama lengkap wajib diisi.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: 'Username sudah digunakan oleh akun lain.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const now = getWITTimestamp();
  const newId = generateUUID();

  db.prepare(`
    INSERT INTO users (id, username, password_hash, name, role, jabatan, email, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newId,
    username.trim(),
    passwordHash,
    name.trim(),
    role || 'PETUGAS',
    jabatan?.trim() || 'Petugas Operasional',
    email?.trim() || '',
    phone?.trim() || '',
    now,
    now
  );

  logAudit('CREATE', 'AUTH', newId, username.trim(), req.user.id, req.user.name, `Membuat akun pengguna baru: ${username}`);

  res.status(201).json({ message: 'Pengguna baru berhasil dibuat.' });
});

export default router;
