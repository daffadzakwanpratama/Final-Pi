/**
 * ==============================================================================
 * MIDDLEWARE AUTENTIKASI JWT (backend/middleware/auth.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * Middleware ini bertindak sebagai "Pintu Gerbang Keamanan" (Guard) untuk rute-rute 
 * yang membutuhkan hak akses Admin.
 * 
 * ALUR KERJA (DATA FLOW):
 * 1. Memeriksa keberadaan header HTTP `Authorization` dalam request.
 * 2. Mengambil token JWT (format: "Bearer <TOKEN>").
 * 3. Memvalidasi keabsahan token menggunakan `jwt.verify` dan `config.jwtSecret`.
 * 4. Jika valid, simpan payload user ke `req.user` dan lanjutkan ke controller via `next()`.
 * 5. Jika tidak valid/kosong, hentikan alur dan kembalikan respon HTTP 401/403.
 * ==============================================================================
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware untuk verifikasi JWT Token pada rute terlindungi
 */
function verifikasiToken(req, res, next) {
  // Ambil header Authorization dari request HTTP
  const authHeader = req.headers['authorization'];
  
  // Format standar header: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  // 1. Jika token tidak ditemukan
  if (!token) {
    return res.status(401).json({ 
      pesan: 'Akses ditolak. Token autentikasi tidak ditemukan. Silakan login terlebih dahulu.' 
    });
  }

  try {
    // 2. Verifikasi keabsahan token menggunakan rahasia JWT terpusat
    const terverifikasi = jwt.verify(token, config.jwtSecret);
    
    // Simpan informasi user hasil dekode token ke objek request
    req.user = terverifikasi; 
    
    // Lanjutkan eksekusi ke handler/controller berikutnya
    next(); 
  } catch (error) {
    // 3. Jika token kedaluwarsa atau diubah tanpa izin
    return res.status(403).json({ 
      pesan: 'Token tidak valid atau telah kedaluwarsa. Silakan login kembali.' 
    });
  }
}

module.exports = verifikasiToken;
