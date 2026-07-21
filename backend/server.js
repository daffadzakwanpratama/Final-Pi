/**
 * ==============================================================================
 * ENTRYPOINT UTAMA SERVER NODE.JS & EXPRESS (backend/server.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini adalah titik awal (entrypoint) yang menginisialisasi aplikasi Express,
 * mendaftarkan middleware global, merutekan REST API, menyajikan static files frontend,
 * serta menangani error global.
 * 
 * ALUR APLIKASI (APPLICATION LIFECYCLE):
 * 1. Memuat variabel lingkungan & konfigurasi terpusat (`config.js`).
 * 2. Mendaftarkan middleware pendukung (`cors`, `express.json`, `express.urlencoded`).
 * 3. Menghubungkan modul rute API (`/api/auth`, `/api/menu`, `/api/orders`, `/api/categories`).
 * 4. Menyajikan file statis Frontend (HTML, CSS, JS, Gambar).
 * 5. Mendaftarkan middleware error handler global di paling bawah.
 * 6. Menjalankan server HTTP pada PORT terkonfigurasi.
 * ==============================================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { globalErrorHandler } = require('./middleware/errorHandler');

// Menghubungkan rute-rute REST API
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const categoryRoutes = require('./routes/categories');

const app = express();

// 1. Middleware global dasar
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 2. Mendaftarkan Rute REST API
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);

// 3. Melayani file statis dari folder frontend (dukungan pengujian lokal)
app.use(express.static(path.join(__dirname, '../frontend')));

// 4. Rute fallback untuk SPA / HTML statis
app.get('*', (req, res, next) => {
  // Hanya layani index.html jika request bukan menuju ke /api
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 5. Middleware Error Handler Global (Wajib dipasang setelah semua rute)
app.use(globalErrorHandler);

// 6. Menjalankan Server HTTP Express
app.listen(config.port, () => {
  console.log(`================================================`);
  console.log(` Server Uncle Jo berjalan di port ${config.port}   `);
  console.log(` Halaman Pengguna: http://localhost:${config.port}  `);
  console.log(` Panel Admin     : http://localhost:${config.port}/admin/login.html`);
  console.log(`================================================`);
});

module.exports = app;
