// Rute Manajemen Pesanan (Pelanggan & Admin)
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifikasiToken = require('../middleware/auth');

// 1. POST /api/orders
// Deskripsi: Membuat pesanan baru (Checkout dari Pelanggan)
router.post('/', async (req, res) => {
  const { nomor_meja, items } = req.body; // items: [{ menu_id, qty }]

  if (!nomor_meja || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ pesan: 'Nomor meja dan item pesanan tidak boleh kosong.' });
  }

  // Koneksi client dari pool untuk transaksi database
  const client = await db.pool.connect();
  
  try {
    // Memulai Transaksi SQL
    await client.query('BEGIN');

    // 1. Simpan data ke tabel orders
    const insertOrderQuery = `
      INSERT INTO orders (nomor_meja, status) 
      VALUES ($1, 'Menunggu') 
      RETURNING *
    `;
    const orderRes = await client.query(insertOrderQuery, [nomor_meja]);
    const orderId = orderRes.rows[0].id;

    // 2. Simpan setiap item ke tabel order_items
    for (const item of items) {
      const { menu_id, qty } = item;
      
      if (!menu_id || qty <= 0) {
        throw new Error('Data item pesanan tidak valid.');
      }

      // Ambil harga menu dari database untuk menghitung subtotal
      const menuRes = await client.query('SELECT harga FROM menu WHERE id = $1', [menu_id]);
      if (menuRes.rows.length === 0) {
        throw new Error(`Menu dengan ID ${menu_id} tidak ditemukan.`);
      }
      
      const harga = menuRes.rows[0].harga;
      const subtotal = harga * qty;

      const insertItemQuery = `
        INSERT INTO order_items (order_id, menu_id, qty, subtotal) 
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(insertItemQuery, [orderId, menu_id, qty, subtotal]);
    }

    // Melakukan Commit jika semua operasi berhasil
    await client.query('COMMIT');

    res.status(201).json({
      pesan: 'Pesanan berhasil dibuat.',
      order_id: orderId
    });

  } catch (error) {
    // Melakukan Rollback jika ada kesalahan
    await client.query('ROLLBACK');
    console.error('Error saat checkout:', error);
    res.status(500).json({ pesan: error.message || 'Terjadi kesalahan saat memproses pesanan.' });
  } finally {
    // Mengembalikan client ke pool
    client.release();
  }
});

// 2. GET /api/orders/:id/status
// Deskripsi: Mendapatkan status pesanan pelanggan secara real-time berdasarkan ID
router.get('/:id/status', async (req, res) => {
  const { id } = req.params;
  try {
    const orderRes = await db.query('SELECT id, nomor_meja, tanggal, status FROM orders WHERE id = $1', [id]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ pesan: 'Pesanan tidak ditemukan.' });
    }
    
    // Ambil detail items untuk melengkapi informasi status
    const itemsRes = await db.query(`
      SELECT oi.*, m.nama, m.harga 
      FROM order_items oi
      LEFT JOIN menu m ON oi.menu_id = m.id
      WHERE oi.order_id = $1
    `, [id]);

    res.json({
      order: orderRes.rows[0],
      items: itemsRes.rows
    });
  } catch (error) {
    console.error('Error GET /api/orders/:id/status:', error);
    res.status(500).json({ pesan: 'Gagal mendapatkan status pesanan.' });
  }
});

// 3. GET /api/orders/dashboard-summary
// Deskripsi: Mengambil ringkasan statistik untuk dashboard admin (Akses Admin)
router.get('/dashboard-summary', verifikasiToken, async (req, res) => {
  try {
    // a. Jumlah Menu
    const menuCount = await db.query('SELECT COUNT(*) FROM menu');
    
    // b. Jumlah Pesanan Hari Ini
    const ordersToday = await db.query(
      "SELECT COUNT(*) FROM orders WHERE DATE(tanggal) = CURRENT_DATE"
    );
    
    // c. Pesanan Menunggu
    const ordersWaiting = await db.query("SELECT COUNT(*) FROM orders WHERE status = 'Menunggu'");
    
    // d. Pesanan Diproses
    const ordersProcessing = await db.query("SELECT COUNT(*) FROM orders WHERE status = 'Diproses'");
    
    // e. Daftar Pesanan Terbaru (5 terakhir)
    const recentOrders = await db.query(`
      SELECT id, nomor_meja, tanggal, status 
      FROM orders 
      ORDER BY tanggal DESC 
      LIMIT 5
    `);

    res.json({
      jumlah_menu: parseInt(menuCount.rows[0].count),
      pesanan_hari_ini: parseInt(ordersToday.rows[0].count),
      pesanan_menunggu: parseInt(ordersWaiting.rows[0].count),
      pesanan_diproses: parseInt(ordersProcessing.rows[0].count),
      pesanan_terbaru: recentOrders.rows
    });

  } catch (error) {
    console.error('Error GET dashboard-summary:', error);
    res.status(500).json({ pesan: 'Gagal mengambil data summary dashboard.' });
  }
});

// 4. GET /api/orders
// Deskripsi: Mendapatkan semua pesanan terurut FIFO (terlama ke terbaru) untuk kelola pesanan (Akses Admin)
router.get('/', verifikasiToken, async (req, res) => {
  try {
    // Urutkan FIFO berdasarkan waktu tanggal terkecil (terlama) ke terbesar (terbaru)
    const ordersRes = await db.query('SELECT * FROM orders ORDER BY tanggal ASC');
    const orders = ordersRes.rows;

    // Gabungkan item detail untuk setiap order
    for (let order of orders) {
      const itemsRes = await db.query(`
        SELECT oi.*, m.nama 
        FROM order_items oi
        LEFT JOIN menu m ON oi.menu_id = m.id
        WHERE oi.order_id = $1
      `, [order.id]);
      order.items = itemsRes.rows;
    }

    res.json(orders);
  } catch (error) {
    console.error('Error GET /api/orders:', error);
    res.status(500).json({ pesan: 'Gagal mengambil daftar pesanan.' });
  }
});

// 5. PATCH /api/orders/:id/status
// Deskripsi: Mengubah status pesanan sesuai tahapan linier (Akses Admin)
router.patch('/:id/status', verifikasiToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // status baru yang dikirim oleh admin

  const statusValid = ['Menunggu', 'Diproses', 'Siap', 'Selesai'];

  if (!status || !statusValid.includes(status)) {
    return res.status(400).json({ pesan: 'Status tidak valid.' });
  }

  try {
    // Periksa apakah order exists
    const orderCheck = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ pesan: 'Pesanan tidak ditemukan.' });
    }

    // Melakukan update status pesanan
    const updateRes = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({
      pesan: 'Status pesanan berhasil diperbarui.',
      order: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Error PATCH /api/orders/:id/status:', error);
    res.status(500).json({ pesan: 'Gagal mengubah status pesanan.' });
  }
});

module.exports = router;
