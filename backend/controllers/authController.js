/**
 * ==============================================================================
 * CONTROLLER AUTENTIKASI ADMINISTRATOR (backend/controllers/authController.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini mengelola logika autentikasi administrator di sisi backend:
 * 1. Menerima data kredensial login (username & password) dari routes.
 * 2. Memvalidasi kecocokan data dengan database PostgreSQL.
 * 3. Menghasilkan JSON Web Token (JWT) jika otentikasi berhasil.
 * 
 * ALUR KERJA (DATA FLOW):
 * Masuk dari: `POST /api/auth/login` (via backend/routes/auth.js)
 * Keluar ke: Respon sukses berisi token JWT atau respon error 400/401 ke frontend.
 * ==============================================================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

// POST /api/auth/login
async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ pesan: 'Username dan password wajib diisi.' });
  }

  const userRes = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  if (userRes.rows.length === 0) {
    return res.status(401).json({ pesan: 'Username atau password salah.' });
  }

  const user = userRes.rows[0];
  const passwordCocok = await bcrypt.compare(password, user.password);
  if (!passwordCocok) {
    return res.status(401).json({ pesan: 'Username atau password salah.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  res.json({
    pesan: 'Login berhasil.',
    token,
    user: { id: user.id, username: user.username }
  });
}

module.exports = {
  login
};
