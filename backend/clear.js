// Script untuk membersihkan data menu dan pesanan di database (Kecuali user Admin)
const db = require('./db');

async function bersihkanDatabase() {
  console.log('================================================');
  console.log(' Memulai Pembersihan Data Menu & Pesanan...     ');
  console.log('================================================');

  try {
    // 1. Bersihkan transaksi lama dan data menu
    console.log('-> Menghapus semua detail item pesanan...');
    await db.query('DELETE FROM order_items');
    
    console.log('-> Menghapus semua daftar pesanan...');
    await db.query('DELETE FROM orders');
    
    console.log('-> Menghapus semua daftar menu...');
    await db.query('DELETE FROM menu');

    console.log('-> Memastikan user admin tetap ada...');
    // Mengecek apakah admin masih terdaftar, jika tidak terbuat secara otomatis di db.js
    const adminCheck = await db.query('SELECT username FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await db.query(
        'INSERT INTO users (username, password) VALUES ($1, $2)',
        ['admin', hashedPassword]
      );
      console.log('   Admin default dibuat ulang: admin / admin123');
    }

    console.log('================================================');
    console.log(' Database Berhasil Dikosongkan!                 ');
    console.log(' Anda bisa mulai mengisi menu warung kopi Anda  ');
    console.log(' melalui Dashboard Admin:                       ');
    console.log(' http://localhost:3281/admin/menu.html          ');
    console.log('================================================');
    process.exit(0);

  } catch (error) {
    console.error('Gagal mengosongkan database:', error);
    process.exit(1);
  }
}

// Jalankan fungsi
bersihkanDatabase();
