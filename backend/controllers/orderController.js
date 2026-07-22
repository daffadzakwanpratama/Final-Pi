/**
 * ==============================================================================
 * CONTROLLER TRANSAKSI & PESANAN (backend/controllers/orderController.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini menangani seluruh siklus transaksi pemesanan dan dashboard admin:
 * 1. createOrder: Membuat pesanan baru, menghitung subtotal, dan mendaftarkan Snap token Midtrans.
 * 2. getOrderStatus: Mengambil status pesanan real-time untuk dilacak pelanggan.
 * 3. getAllOrders: Mengambil daftar pesanan terurut FIFO untuk dapur/kasir admin.
 * 4. updateOrderStatus / markPaid: Memperbarui status pesanan & menandai lunas transaksi tunai.
 * 5. getDashboardSummary: Menghitung total omset, jumlah pesanan, dan menu terlaris.
 * 
 * ALUR KERJA (DATA FLOW):
 * Masuk dari: Request HTTP yang diarahkan oleh `backend/routes/orders.js`
 * Keluar ke: Mengirim data Snap token Midtrans, status pesanan real-time, atau statistik admin.
 * ==============================================================================
 */

const db = require('../db');
const config = require('../config');
const midtransClient = require('midtrans-client');

const snapClient = new midtransClient.Snap({
  isProduction: config.midtrans.isProduction,
  serverKey: config.midtrans.serverKey,
  clientKey: config.midtrans.clientKey
});

// POST /api/orders
async function createOrder(req, res) {
  const { nomor_meja, items, metode_pembayaran, nama_pelanggan } = req.body;

  if (!nomor_meja || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ pesan: 'Nomor meja dan item pesanan tidak boleh kosong.' });
  }

  const paymentMethod = metode_pembayaran === 'nontunai' ? 'nontunai' : 'tunai';
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

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

    for (const item of items) {
      const { menu_id, qty, varian } = item;
      
      if (!menu_id || qty <= 0) {
        throw new Error('Data item pesanan tidak valid.');
      }

      const menuRes = await client.query(
        'SELECT nama, harga, is_hot_ice, harga_hot, harga_ice FROM menu WHERE id = $1', 
        [menu_id]
      );
      if (menuRes.rows.length === 0) {
        throw new Error(`Menu dengan ID ${menu_id} tidak ditemukan.`);
      }
      
      const menu = menuRes.rows[0];
      let harga = Number(menu.harga);

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

    await client.query('COMMIT');

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

        await db.query('UPDATE orders SET midtrans_token = $1 WHERE id = $2', [snapToken, orderId]);

        return res.status(201).json({
          pesan: 'Pesanan berhasil dibuat. Silakan selesaikan pembayaran.',
          order_id: orderId,
          snap_token: snapToken,
          redirect_url: redirectUrl
        });
      } catch (midtransErr) {
        console.error('Error Midtrans Snap API:', midtransErr);
        return res.status(201).json({
          pesan: 'Pesanan dibuat, tetapi gagal memproses pembayaran online. Silakan bayar secara tunai di kasir.',
          order_id: orderId,
          fallback_to_cash: true
        });
      }
    }

    return res.status(201).json({
      pesan: 'Pesanan berhasil dibuat. Silakan bayar di kasir.',
      order_id: orderId
    });

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// GET /api/orders/:id/status
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

// GET /api/orders/dashboard-summary
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

// GET /api/orders
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

// PATCH /api/orders/:id/status
async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const statusValid = ['Menunggu', 'Diproses', 'Siap', 'Selesai'];
  if (!status || !statusValid.includes(status)) {
    return res.status(400).json({ pesan: 'Status tidak valid.' });
  }

  const updateRes = await db.query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  if (updateRes.rows.length === 0) {
    return res.status(404).json({ pesan: 'Pesanan tidak ditemukan.' });
  }

  res.json({
    pesan: 'Status pesanan berhasil diperbarui.',
    order: updateRes.rows[0]
  });
}

// POST /api/orders/notification
async function handleMidtransNotification(req, res) {
  const statusResponse = req.body;
  
  const transactionStatus = statusResponse.transaction_status;
  const fraudStatus = statusResponse.fraud_status;
  
  const parts = (statusResponse.order_id || '').split('-');
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

// POST /api/orders/:id/mark-paid
async function markOrderAsPaid(req, res) {
  const { id } = req.params;

  const updateRes = await db.query(
    "UPDATE orders SET status_pembayaran = 'Sudah Bayar' WHERE id = $1 RETURNING id",
    [id]
  );
  if (updateRes.rows.length === 0) {
    return res.status(404).json({ pesan: 'Pesanan tidak ditemukan.' });
  }
  
  res.json({ pesan: 'Pesanan berhasil ditandai sebagai Lunas.' });
}

// POST /api/orders/:id/update-payment-client
async function updatePaymentFromClient(req, res) {
  const { id } = req.params;
  const { status_pembayaran } = req.body;
  const paymentStatus = status_pembayaran || 'Sudah Bayar';

  const updateRes = await db.query(
    "UPDATE orders SET status_pembayaran = $1 WHERE id = $2 RETURNING id",
    [paymentStatus, id]
  );
  if (updateRes.rows.length === 0) {
    return res.status(404).json({ pesan: 'Pesanan tidak ditemukan.' });
  }
  
  res.json({ pesan: 'Status pembayaran berhasil diperbarui dari client.', status_pembayaran: paymentStatus });
}

// DELETE /api/orders/today
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
