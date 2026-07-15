// Modul koneksi PostgreSQL dan inisialisasi awal database
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Membuat pool koneksi PostgreSQL
// Mendukung DATABASE_URL (seperti Supabase/Heroku) dengan SSL, atau konfigurasi lokal biasa
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Diperlukan agar koneksi ke server cloud (Supabase) berhasil tanpa kendala SSL
      }
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'qr_ordering',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
    });

// Fungsi untuk membuat tabel dan data admin awal jika belum ada
async function inisialisasiDatabase() {
  try {
    // Membaca file init.sql
    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Menjalankan query pembuatan tabel
    await pool.query(sql);
    console.log('-> Struktur tabel database berhasil diverifikasi/dibuat.');

    // Memeriksa keberadaan user admin default
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (userCheck.rows.length === 0) {
      // Membuat password admin terenkripsi
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      // Memasukkan data admin ke database
      await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2)',
        ['admin', hashedPassword]
      );
      console.log('-> Admin default berhasil dibuat (Username: admin, Password: admin123)');
    }

    // Menu default tidak dimasukkan secara otomatis agar user bisa mengisi menu kustom sendiri.
  } catch (error) {
    console.error('Gagal melakukan inisialisasi database:', error);
  }
}

// Jalankan inisialisasi database
inisialisasiDatabase();

// Export fungsi query pembantu dan fungsi inisialisasi
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  inisialisasiDatabase
};
