// Rute Autentikasi Admin
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

// POST /api/auth/login
// Deskripsi: Login admin dan mengembalikan token JWT
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Validasi input kosong
  if (!username || !password) {
    return res.status(400).json({ pesan: 'Username dan password wajib diisi.' });
  }

  try {
    // Cari user berdasarkan username
    const userRes = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (userRes.rows.length === 0) {
      return res.status(401).json({ pesan: 'Username atau password salah.' });
    }

    const user = userRes.rows[0];

    // Bandingkan password terenkripsi
    const passwordCocok = await bcrypt.compare(password, user.password);
    if (!passwordCocok) {
      return res.status(401).json({ pesan: 'Username atau password salah.' });
    }

    // Buat token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'kopi_qr_secret_key_123',
      { expiresIn: '1d' } // Token berlaku selama 1 hari
    );

    // Kirim response sukses dengan token
    res.json({
      pesan: 'Login berhasil.',
      token: token,
      user: { id: user.id, username: user.username }
    });

  } catch (error) {
    console.error('Error saat login:', error);
    res.status(500).json({ pesan: 'Terjadi kesalahan pada server.' });
  }
});

module.exports = router;
