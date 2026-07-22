/**
 * ==============================================================================
 * KONFIGURASI TERPUSAT APLIKASI (backend/config.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini berfungsi sebagai "Single Source of Truth" untuk seluruh variabel 
 * lingkungan (Environment Variables) dan konstanta konfigurasi backend.
 * 
 * MENGAPA PENTING (Prinsip Clean Code - DRY & Centralized Config):
 * 1. Mencegah duplikasi penulisan string rahasia (seperti JWT secret atau Port).
 * 2. Memudahkan pengubahan nilai konfigurasi dari satu tempat saja tanpa merubah
 *    banyak file lainnya.
 * 3. Memberikan nilai standar (default value) yang aman jika variabel di .env belum diisi.
 * ==============================================================================
 */

const path = require('path');

// Memuat variabel lingkungan dari file .env di root proyek
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  // Port tempat server Express berjalan (default: 3281)
  port: process.env.PORT || 3281,

  // Kunci rahasia untuk pembuatan dan verifikasi token autentikasi JWT Admin
  jwtSecret: process.env.JWT_SECRET || 'kopi_qr_secret_key_123',

  // Masa berlaku token JWT (misal: 1d = 1 hari)
  jwtExpiresIn: '1d',

  // Konfigurasi Koneksi Database PostgreSQL
  db: {
    connectionString: process.env.DATABASE_URL || null,
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'qr_ordering',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
  },

  // Konfigurasi Payment Gateway Midtrans
  midtrans: {
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'false',
    serverKey: (process.env.MIDTRANS_SERVER_KEY || '').trim(),
    clientKey: (process.env.MIDTRANS_CLIENT_KEY || '').trim()
  }
};
