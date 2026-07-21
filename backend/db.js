/**
 * ==============================================================================
 * MODUL DATABASE POSTGRESQL (backend/db.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini bertanggung jawab mengelola koneksi database PostgreSQL menggunakan Pool,
 * serta mengeksekusi migrasi tabel awal & pembuatan data admin default.
 * 
 * ALUR KERJA (DATA FLOW):
 * 1. Mengimpor konfigurasi dari `config.js`.
 * 2. Membuka koneksi pool ke database PostgreSQL (lokal atau cloud seperti Supabase).
 * 3. Menjalankan skrip inisialisasi database (`init.sql`) saat aplikasi di-start.
 * 4. Mengekspor helper `query` dan `pool` untuk digunakan oleh modul Repository/Controller.
 * ==============================================================================
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config');

/**
 * Inisialisasi Connection Pool ke PostgreSQL.
 * Menggunakan SSL jika terhubung ke cloud (DATABASE_URL diisi),
 * atau menggunakan kredensial lokal (host, user, pass, port).
 */
const pool = config.db.connectionString
  ? new Pool({
      connectionString: config.db.connectionString,
      ssl: { rejectUnauthorized: false } // Diperlukan untuk cloud provider seperti Supabase
    })
  : new Pool({
      user: config.db.user,
      host: config.db.host,
      database: config.db.database,
      password: config.db.password,
      port: config.db.port,
    });

/**
 * Fungsi untuk menginisialisasi struktur tabel dan data dasar database.
 * Dijalankan otomatis saat aplikasi dinyalakan.
 */
async function inisialisasiDatabase() {
  try {
    // 1. Membaca dan mengeksekusi skrip init.sql
    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('-> Structure: Tabel dasar berhasil diverifikasi/dibuat.');

    // 2. Migrasi kolom opsional (menjamin keandalan kolom jika skema diperbarui)
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

    // 3. Membuat tabel kategori jika belum ada
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(50) UNIQUE NOT NULL
      )
    `);

    // 4. Seed data kategori default
    await pool.query("INSERT INTO categories (nama) VALUES ('Minuman'), ('Makanan'), ('Snack') ON CONFLICT DO NOTHING");

    // 5. Inisialisasi User Admin Default jika belum pernah dibuat
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (userCheck.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2)',
        ['admin', hashedPassword]
      );
      console.log('-> Admin default berhasil dibuat (Username: admin, Password: admin123)');
    }
  } catch (error) {
    console.error('Gagal melakukan inisialisasi database:', error);
  }
}

// Jalankan inisialisasi database secara otomatis
inisialisasiDatabase();

module.exports = {
  /**
   * Helper query pembantu untuk mengeksekusi SQL statement sederhana
   * @param {string} text - Query SQL yang akan dieksekusi
   * @param {Array} params - Parameter query SQL ($1, $2, dst)
   */
  query: (text, params) => pool.query(text, params),
  pool,
  inisialisasiDatabase
};
