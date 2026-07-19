// Modul koneksi PostgreSQL dan inisialisasi awal database
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

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

    // Migrasi kolom tambahan untuk Deskripsi & Varian
    await pool.query('ALTER TABLE menu ADD COLUMN IF NOT EXISTS deskripsi TEXT');
    await pool.query('ALTER TABLE menu ADD COLUMN IF NOT EXISTS is_hot_ice BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE menu ADD COLUMN IF NOT EXISTS harga_hot INT');
    await pool.query('ALTER TABLE menu ADD COLUMN IF NOT EXISTS harga_ice INT');
    await pool.query('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS varian VARCHAR(20)');
    await pool.query('ALTER TABLE menu ADD COLUMN IF NOT EXISTS is_favorit BOOLEAN DEFAULT FALSE');
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS metode_pembayaran VARCHAR(20) DEFAULT 'tunai'");
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_pembayaran VARCHAR(20) DEFAULT 'Belum Bayar'");
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS midtrans_token VARCHAR(100)");
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS nama_pelanggan VARCHAR(100) DEFAULT 'Pelanggan'");
    
    // Pembuatan tabel kategori dinamis
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(50) UNIQUE NOT NULL
      )
    `);
    
    // Seed Kategori Awal
    await pool.query("INSERT INTO categories (nama) VALUES ('Minuman'), ('Makanan'), ('Snack') ON CONFLICT DO NOTHING");
    
    console.log('-> Migrasi kolom deskripsi, is_hot_ice, harga varian, dan tabel kategori berhasil.');

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
