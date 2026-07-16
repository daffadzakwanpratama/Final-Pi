// Rute Manajemen Pesanan (Pelanggan & Admin)
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifikasiToken = require('../middleware/auth');
const midtransClient = require('midtrans-client');

// Inisialisasi Midtrans Snap Client
const snapClient = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: (process.env.MIDTRANS_SERVER_KEY || '').trim(),
  clientKey: (process.env.MIDTRANS_CLIENT_KEY || '').trim()
});

// 1. POST /api/orders
// Deskripsi: Membuat pesanan baru (Checkout dari Pelanggan)
router.post('/', async (req, res) => {
  const { nomor_meja, items, metode_pembayaran, nama_pelanggan } = req.body; // items: [{ menu_id, qty, varian }], metode_pembayaran: 'tunai'/'nontunai'

  if (!nomor_meja || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ pesan: 'Nomor meja dan item pesanan tidak boleh kosong.' });
  }

  const paymentMethod = metode_pembayaran === 'nontunai' ? 'nontunai' : 'tunai';

  // Koneksi client dari pool untuk transaksi database
  const client = await db.pool.connect();
  
  try {
    // Memulai Transaksi SQL
    await client.query('BEGIN');

    // 1. Simpan data ke tabel orders
    const insertOrderQuery = `
      INSERT INTO orders (nomor_meja, status, metode_pembayaran, status_pembayaran, nama_pelanggan) 
      VALUES ($1, 'Menunggu', $2, 'Belum Bayar', $3) 
      RETURNING *
    `;
    const orderRes = await client.query(insertOrderQuery, [nomor_meja, paymentMethod, nama_pelanggan || 'Pelanggan']);
    const orderId = orderRes.rows[0].id;

    let totalHarga = 0;
    const itemDetails = [];

    // 2. Simpan setiap item ke tabel order_items
    for (const item of items) {
      const { menu_id, qty, varian } = item;
      
      if (!menu_id || qty <= 0) {
        throw new Error('Data item pesanan tidak valid.');
      }

      // Ambil harga menu dari database (termasuk harga varian) untuk menghitung subtotal
      const menuRes = await client.query('SELECT nama, harga, is_hot_ice, harga_hot, harga_ice FROM menu WHERE id = $1', [menu_id]);
      if (menuRes.rows.length === 0) {
        throw new Error(`Menu dengan ID ${menu_id} tidak ditemukan.`);
      }
      
      const menu = menuRes.rows[0];
      let harga = Number(menu.harga);

      // Gunakan harga varian jika is_hot_ice aktif dan varian terdefinisi
      if (menu.is_hot_ice) {
        if (varian === 'Hot' && menu.harga_hot !== null) {
          harga = Number(menu.harga_hot);
        } else if (varian === 'Ice' && menu.harga_ice !== null) {
          harga = Number(menu.harga_ice);
        }
      }

      const subtotal = harga * Number(qty);
      totalHarga += subtotal;

      const insertItemQuery = `
        INSERT INTO order_items (order_id, menu_id, qty, subtotal, varian) 
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(insertItemQuery, [orderId, menu_id, qty, subtotal, varian || null]);

      itemDetails.push({
        id: `MENU-${menu_id}`,
        price: Number(harga),
        quantity: Number(qty),
        name: String(menu.nama + (varian ? ` (${varian})` : '')).substring(0, 50)
      });
    }

    // Melakukan Commit jika semua operasi berhasil
    await client.query('COMMIT');

    // Integrasi Midtrans jika non-tunai
    if (paymentMethod === 'nontunai') {
      try {
        const midtransParams = {
          transaction_details: {
            order_id: `ORDER-${orderId}-${Date.now()}`,
            gross_amount: Number(totalHarga)
          },
          item_details: itemDetails,
          customer_details: {
            first_name: nama_pelanggan || `Pelanggan Meja ${nomor_meja}`
          }
        };

        const transaction = await snapClient.createTransaction(midtransParams);
        const snapToken = transaction.token;
        const redirectUrl = transaction.redirect_url;

        // Simpan token ke database orders
        await db.query('UPDATE orders SET midtrans_token = $1 WHERE id = $2', [snapToken, orderId]);

        return res.status(201).json({
          pesan: 'Pesanan berhasil dibuat. Silakan selesaikan pembayaran.',
          order_id: orderId,
          snap_token: snapToken,
          redirect_url: redirectUrl
        });
      } catch (midtransErr) {
        console.error('Error Midtrans Snap API:', midtransErr);
        // Fallback jika Midtrans error, tetap kembalikan order_id agar pesanan tidak hilang (bisa bayar cash/tunai)
        return res.status(201).json({
          pesan: 'Pesanan dibuat, tetapi gagal memproses pembayaran online. Silakan bayar secara tunai di kasir.',
          order_id: orderId,
          fallback_to_cash: true
        });
      }
    }

    // Jika tunai
    return res.status(201).json({
      pesan: 'Pesanan berhasil dibuat. Silakan bayar di kasir.',
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
    const orderRes = await db.query('SELECT id, nomor_meja, nama_pelanggan, tanggal, status, metode_pembayaran, status_pembayaran, midtrans_token FROM orders WHERE id = $1', [id]);
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
      SELECT id, nomor_meja, nama_pelanggan, tanggal, status 
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

// 6. POST /api/orders/notification
// Deskripsi: Menangani notifikasi status pembayaran dari Midtrans (Webhook)
router.post('/notification', async (req, res) => {
  const statusResponse = req.body;
  
  try {
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;
    
    // Format order_id di Midtrans: ORDER-{id}-{timestamp}
    const parts = statusResponse.order_id.split('-');
    const dbOrderId = parseInt(parts[1]); // ID order asli di database
    
    if (isNaN(dbOrderId)) {
      return res.status(400).json({ pesan: 'Order ID tidak valid.' });
    }
    
    let paymentStatus = 'Belum Bayar';
    
    if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge') {
        paymentStatus = 'Belum Bayar';
      } else if (fraudStatus === 'accept') {
        paymentStatus = 'Sudah Bayar';
      }
    } else if (transactionStatus === 'settlement') {
      paymentStatus = 'Sudah Bayar';
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      paymentStatus = 'Gagal';
    } else if (transactionStatus === 'pending') {
      paymentStatus = 'Belum Bayar';
    }
    
    // Update status_pembayaran di database
    await db.query('UPDATE orders SET status_pembayaran = $1 WHERE id = $2', [paymentStatus, dbOrderId]);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling Midtrans notification:', error);
    res.status(500).json({ pesan: 'Terjadi kesalahan saat memproses notifikasi.' });
  }
});

// 7. POST /api/orders/:id/mark-paid
// Deskripsi: Menandai pesanan telah lunas secara manual (Akses Admin)
router.post('/:id/mark-paid', verifikasiToken, async (req, res) => {
  const { id } = req.params;
  try {
    const orderCheck = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ pesan: 'Pesanan tidak ditemukan.' });
    }
    
    await db.query("UPDATE orders SET status_pembayaran = 'Sudah Bayar' WHERE id = $1", [id]);
    
    res.json({ pesan: 'Pesanan berhasil ditandai sebagai Lunas.' });
  } catch (error) {
    console.error('Error POST /api/orders/:id/mark-paid:', error);
    res.status(500).json({ pesan: 'Gagal menandai lunas.' });
  }
});

// 8. POST /api/orders/:id/update-payment-client
// Deskripsi: Memperbarui status pembayaran dari client-side callback (sangat berguna untuk localhost/offline testing)
router.post('/:id/update-payment-client', async (req, res) => {
  const { id } = req.params;
  const { status_pembayaran } = req.body;
  try {
    const orderCheck = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ pesan: 'Pesanan tidak ditemukan.' });
    }
    
    const paymentStatus = status_pembayaran || 'Sudah Bayar';
    await db.query("UPDATE orders SET status_pembayaran = $1 WHERE id = $2", [paymentStatus, id]);
    
    res.json({ pesan: 'Status pembayaran berhasil diperbarui dari client.', status_pembayaran: paymentStatus });
  } catch (error) {
    console.error('Error POST /api/orders/:id/update-payment-client:', error);
    res.status(500).json({ pesan: 'Gagal memperbarui status pembayaran dari client.' });
  }
});

module.exports = router;
