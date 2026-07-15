// Middleware untuk memvalidasi JWT token admin
const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifikasiToken(req, res, next) {
  // Mengambil token dari header Authorization
  const authHeader = req.headers['authorization'];
  
  // Format token: Bearer <TOKEN>
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      pesan: 'Akses ditolak. Token tidak ditemukan. Silakan login kembali.' 
    });
  }

  try {
    // Memverifikasi token JWT
    const terverifikasi = jwt.verify(token, process.env.JWT_SECRET || 'kopi_qr_secret_key_123');
    req.user = terverifikasi; // Menyimpan data user terverifikasi ke object request
    next(); // Melanjutkan ke handler rute berikutnya
  } catch (error) {
    res.status(403).json({ 
      pesan: 'Token tidak valid atau telah kedaluwarsa. Silakan login kembali.' 
    });
  }
}

module.exports = verifikasiToken;
