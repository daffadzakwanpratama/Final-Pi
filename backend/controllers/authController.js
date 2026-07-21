/**
 * ==============================================================================
 * CONTROLLER AUTENTIKASI ADMIN (backend/controllers/authController.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * Controller ini menangani logika HTTP request untuk fitur Autentikasi Admin (Login).
 * 
 * ALUR KERJA (DATA FLOW):
 * 1. Menerima `username` dan `password` dari request body HTTP.
 * 2. Memeriksa keberadaan user admin di tabel `users`.
 * 3. Memverifikasi kata sandi menggunakan `bcrypt.compare`.
 * 4. Jika valid, membuat token JWT yang berisi ID & username admin.
 * 5. Mengirimkan token kembali ke client (frontend).
 * ==============================================================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

/**
 * Controller untuk Login Admin
 * POST /api/auth/login
 */
async function login(req, res) {
  const { username, password } = req.body;

  // 1. Validasi input
  if (!username || !password) {
    return res.status(400).json({ pesan: 'Username dan password wajib diisi.' });
  }

  // 2. Cari data admin di database
  const userRes = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  if (userRes.rows.length === 0) {
    return res.status(401).json({ pesan: 'Username atau password salah.' });
  }

  const user = userRes.rows[0];

  // 3. Verifikasi enkripsi kata sandi
  const passwordCocok = await bcrypt.compare(password, user.password);
  if (!passwordCocok) {
    return res.status(401).json({ pesan: 'Username atau password salah.' });
  }

  // 4. Generate JWT Token
  const token = jwt.sign(
    { id: user.id, username: user.username },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  // 5. Kirim respon sukses beserta token
  res.json({
    pesan: 'Login berhasil.',
    token: token,
    user: { id: user.id, username: user.username }
  });
}

module.exports = {
  login
};
