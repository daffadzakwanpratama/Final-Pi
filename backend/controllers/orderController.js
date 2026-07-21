/**
 * ==============================================================================
 * CONTROLLER TRANSAKSI & PESANAN (backend/controllers/orderController.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * Controller ini adalah pusat pengolahan transaksi pemesanan makanan/minuman,
 * integrasi pembayaran digital Midtrans Snap, serta manajemen status oleh Admin.
 * 
 * ALUR KERJA PESANAN (TRANSACTION FLOW):
 * 1. Pelanggan memilih menu & melakukan Checkout -> `createOrder`.
 * 2. Sistem membuka Transaksi Database (`BEGIN`), menyimpan ke tabel `orders` & `order_items`.
 * 3. Jika metode pembayaran `nontunai`, sistem meminta Token Snap dari Midtrans API.
 * 4. Pelanggan memantau status secara real-time -> `getOrderStatus`.
 * 5. Admin mengelola status pesanan (Menunggu -> Diproses -> Siap -> Selesai) -> `updateOrderStatus`.
 * ==============================================================================
 */

const db = require('../db');
const config = require('../config');
const midtransClient = require('midtrans-client');

// Inisialisasi Midtrans Snap Client dari Konfigurasi Terpusat
const snapClient = new midtransClient.Snap({
  isProduction: config.midtrans.isProduction,
  serverKey: config.midtrans.serverKey,
  clientKey: config.midtrans.clientKey
});

/**
 * 1. Membuat pesanan baru (Checkout dari Pelanggan)
 * POST /api/orders
 */
async function createOrder(req, res) {
  const { nomor_meja, items, metode_pembayaran, nama_pelanggan } = req.body;

  // Validasi input dasar
  if (!nomor_meja || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ pesan: 'Nomor meja dan item pesanan tidak boleh kosong.' });
  }

  const paymentMethod = metode_pembayaran === 'nontunai' ? 'nontunai' : 'tunai';

  // Ambil koneksi client dari pool untuk Transaksi SQL yang bersifat atomic
  const client = await db.pool.connect();
  
  try {
    // Memulai Transaksi SQL (ACID Compliance)
    await client.query('BEGIN');

    // a. Simpan data header ke tabel `orders`
    const insertOrderQuery = `
      INSERT INTO orders (nomor_meja, status, metode_pembayaran, status_pembayaran, nama_pelanggan) 
      VALUES ($1, 'Menunggu', $2, 'Belum Bayar', $3) 
      RETURNING *
    `;
    const orderRes = await client.query(insertOrderQuery, [
      nomor_meja, 
      paymentMethod, 
      nama_pelanggan || 'Pelanggan'
    ]);
    const orderId = orderRes.rows[0].id;

    let totalHarga = 0;
    const itemDetails = [];

    // b. Simpan setiap rincian item ke tabel `order_items`
    for (const item of items) {
      const { menu_id, qty, varian } = item;
      
      if (!menu_id || qty <= 0) {
        throw new Error('Data item pesanan tidak valid.');
      }

      // Ambil data menu asli dari DB untuk menghitung subtotal secara akurat (keamanan harga)
      const menuRes = await client.query(
        'SELECT nama, harga, is_hot_ice, harga_hot, harga_ice FROM menu WHERE id = $1', 
        [menu_id]
      );
      if (menuRes.rows.length === 0) {
        throw new Error(`Menu dengan ID ${menu_id} tidak ditemukan.`);
      }
      
      const menu = menuRes.rows[0];
      let harga = Number(menu.harga);

      // Hitung harga berdasarkan varian jika menu mendukung Hot/Ice
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

    // Melakukan Commit SQL jika seluruh item berhasil dimasukkan
    await client.query('COMMIT');

    // c. Integrasi Midtrans jika metode pembayaran Non-Tunai
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

        // Simpan token transaksi Midtrans ke database orders
        await db.query('UPDATE orders SET midtrans_token = $1 WHERE id = $2', [snapToken, orderId]);

        return res.status(201).json({
          pesan: 'Pesanan berhasil dibuat. Silakan selesaikan pembayaran.',
          order_id: orderId,
          snap_token: snapToken,
          redirect_url: redirectUrl
        });
      } catch (midtransErr) {
        console.error('Error Midtrans Snap API:', midtransErr);
        // Fallback jika API Midtrans offline/error: tetapkan pesanan dengan opsi tunai
        return res.status(201).json({
          pesan: 'Pesanan dibuat, tetapi gagal memproses pembayaran online. Silakan bayar secara tunai di kasir.',
          order_id: orderId,
          fallback_to_cash: true
        });
      }
    }

    // Respon untuk pembayaran Tunai
    return res.status(201).json({
      pesan: 'Pesanan berhasil dibuat. Silakan bayar di kasir.',
      order_id: orderId
    });

  } catch (error) {
    // Batalkan transaksi jika terjadi kesalahan di tengah alur
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Lepaskan koneksi client kembali ke pool
    client.release();
  }
}

/**
 * 2. Mendapatkan status pesanan real-time berdasarkan ID
 * GET /api/orders/:id/status
 */
async function getOrderStatus(req, res) {
  const { id } = req.params;

  const orderRes = await db.query(
    'SELECT id, nomor_meja, nama_pelanggan, tanggal, status, metode_pembayaran, status_pembayaran, midtrans_token FROM orders WHERE id = $1', 
    [id]
  );
  if (orderRes.rows.length === 0) {
    return res.status(404).json({ pesan: 'Pesanan tidak ditemukan.' });
  }
  
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
}

/**
 * 3. Mengambil ringkasan statistik untuk dashboard admin (Akses Admin)
 * GET /api/orders/dashboard-summary
 */
async function getDashboardSummary(req, res) {
  const menuCount = await db.query('SELECT COUNT(*) FROM menu');
  const ordersToday = await db.query("SELECT COUNT(*) FROM orders WHERE DATE(tanggal) = CURRENT_DATE");
  const ordersWaiting = await db.query("SELECT COUNT(*) FROM orders WHERE status = 'Menunggu'");
  const ordersProcessing = await db.query("SELECT COUNT(*) FROM orders WHERE status = 'Diproses'");
  
  const recentOrders = await db.query(`
    SELECT id, nomor_meja, nama_pelanggan, tanggal, status 
    FROM orders 
    ORDER BY tanggal DESC 
    LIMIT 5
  `);

  res.json({
    jumlah_menu: parseInt(menuCount.rows[0].count, 10),
    pesanan_hari_ini: parseInt(ordersToday.rows[0].count, 10),
    pesanan_menunggu: parseInt(ordersWaiting.rows[0].count, 10),
    pesanan_diproses: parseInt(ordersProcessing.rows[0].count, 10),
    pesanan_terbaru: recentOrders.rows
  });
}

/**
 * 4. Mendapatkan semua pesanan terurut FIFO (terlama ke terbaru) (Akses Admin)
 * GET /api/orders
 */
async function getAllOrders(req, res) {
  const ordersRes = await db.query('SELECT * FROM orders ORDER BY tanggal ASC');
  const orders = ordersRes.rows;

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
}

/**
 * 5. Mengubah status pesanan sesuai tahapan linier (Akses Admin)
 * PATCH /api/orders/:id/status
 */
async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const statusValid = ['Menunggu', 'Diproses', 'Siap', 'Selesai'];

  if (!status || !statusValid.includes(status)) {
    return res.status(400).json({ pesan: 'Status tidak valid.' });
  }

  const orderCheck = await db.query('SELECT id FROM orders WHERE id = $1', [id]);
  if (orderCheck.rows.length === 0) {
    return res.status(404).json({ pesan: 'Pesanan tidak ditemukan.' });
  }

  const updateRes = await db.query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );

  res.json({
    pesan: 'Status pesanan berhasil diperbarui.',
    order: updateRes.rows[0]
  });
}

/**
 * 6. Menangani notifikasi status pembayaran dari Midtrans Webhook
 * POST /api/orders/notification
 */
async function handleMidtransNotification(req, res) {
  const statusResponse = req.body;
  
  const transactionStatus = statusResponse.transaction_status;
  const fraudStatus = statusResponse.fraud_status;
  
  // Format order_id di Midtrans: ORDER-{id}-{timestamp}
  const parts = statusResponse.order_id.split('-');
  const dbOrderId = parseInt(parts[1], 10);
  
  if (isNaN(dbOrderId)) {
    return res.status(400).json({ pesan: 'Order ID tidak valid.' });
  }
  
  let paymentStatus = 'Belum Bayar';
  
  if (transactionStatus === 'capture') {
    paymentStatus = (fraudStatus === 'challenge') ? 'Belum Bayar' : 'Sudah Bayar';
  } else if (transactionStatus === 'settlement') {
    paymentStatus = 'Sudah Bayar';
  } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
    paymentStatus = 'Gagal';
  }
  
  await db.query('UPDATE orders SET status_pembayaran = $1 WHERE id = $2', [paymentStatus, dbOrderId]);
  
  res.status(200).send('OK');
}

/**
 * 7. Menandai pesanan telah lunas secara manual (Akses Admin)
 * POST /api/orders/:id/mark-paid
 */
async function markOrderAsPaid(req, res) {
  const { id } = req.params;

  const orderCheck = await db.query('SELECT id FROM orders WHERE id = $1', [id]);
  if (orderCheck.rows.length === 0) {
    return res.status(404).json({ pesan: 'Pesanan tidak ditemukan.' });
  }
  
  await db.query("UPDATE orders SET status_pembayaran = 'Sudah Bayar' WHERE id = $1", [id]);
  
  res.json({ pesan: 'Pesanan berhasil ditandai sebagai Lunas.' });
}

/**
 * 8. Memperbarui status pembayaran dari client-side callback
 * POST /api/orders/:id/update-payment-client
 */
async function updatePaymentFromClient(req, res) {
  const { id } = req.params;
  const { status_pembayaran } = req.body;

  const orderCheck = await db.query('SELECT id FROM orders WHERE id = $1', [id]);
  if (orderCheck.rows.length === 0) {
    return res.status(404).json({ pesan: 'Pesanan tidak ditemukan.' });
  }
  
  const paymentStatus = status_pembayaran || 'Sudah Bayar';
  await db.query("UPDATE orders SET status_pembayaran = $1 WHERE id = $2", [paymentStatus, id]);
  
  res.json({ pesan: 'Status pembayaran berhasil diperbarui dari client.', status_pembayaran: paymentStatus });
}

/**
 * 9. Menghapus semua pesanan (Akses Admin)
 * DELETE /api/orders/today
 */
async function deleteAllOrders(req, res) {
  const result = await db.query("DELETE FROM orders");
  res.json({ pesan: `Berhasil menghapus seluruh pesanan (${result.rowCount} pesanan telah dibersihkan).` });
}

module.exports = {
  createOrder,
  getOrderStatus,
  getDashboardSummary,
  getAllOrders,
  updateOrderStatus,
  handleMidtransNotification,
  markOrderAsPaid,
  updatePaymentFromClient,
  deleteAllOrders
};
