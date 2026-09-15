import jwt from 'jsonwebtoken';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'koyabhu-bumkam-secret-key-2026-jayapura';

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      jabatan: user.jabatan
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Sesi kedaluwarsa atau belum masuk. Silakan login kembali.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token tidak valid atau telah berakhir. Silakan login kembali.' });
    }

    // Fetch latest user data from DB to verify user still exists and active
    const user = db.prepare('SELECT id, username, name, role, jabatan, email, phone FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Pengguna tidak ditemukan.' });
    }

    req.user = user;
    next();
  });
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Pengguna belum terautentikasi.' });
    }

    const userRole = req.user.role;
    // Normalize role: PETUGAS is equivalent to PETUGAS_KANDANG
    const isAllowed =
      allowedRoles.includes(userRole) ||
      (allowedRoles.includes('PETUGAS_KANDANG') && userRole === 'PETUGAS') ||
      (allowedRoles.includes('PETUGAS') && userRole === 'PETUGAS_KANDANG');

    if (!isAllowed) {
      return res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki izin untuk fitur atau menu ini.' });
    }
    next();
  };
}

