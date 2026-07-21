/**
 * ==============================================================================
 * RUTE TRANSAKSI & PESANAN (backend/routes/orders.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini mendefinisikan endpoint HTTP untuk transaksi pesanan, integrasi Midtrans,
 * status real-time, dan manajemen pesanan oleh admin.
 * 
 * ALUR KERJA (DATA FLOW):
 * 1. POST /api/orders -> `orderController.createOrder` (Checkout)
 * 2. GET /api/orders/:id/status -> `orderController.getOrderStatus` (Status Pelanggan)
 * 3. GET /api/orders/dashboard-summary -> `verifikasiToken` -> `orderController.getDashboardSummary` (Admin)
 * 4. GET /api/orders -> `verifikasiToken` -> `orderController.getAllOrders` (Admin FIFO)
 * 5. PATCH /api/orders/:id/status -> `verifikasiToken` -> `orderController.updateOrderStatus` (Admin)
 * 6. POST /api/orders/notification -> `orderController.handleMidtransNotification` (Midtrans Webhook)
 * 7. POST /api/orders/:id/mark-paid -> `verifikasiToken` -> `orderController.markOrderAsPaid` (Admin)
 * 8. POST /api/orders/:id/update-payment-client -> `orderController.updatePaymentFromClient` (Client Callback)
 * 9. DELETE /api/orders/today -> `verifikasiToken` -> `orderController.deleteAllOrders` (Admin)
 * ==============================================================================
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const verifikasiToken = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// 1. POST /api/orders - Membuat pesanan baru (Checkout Pelanggan)
router.post('/', asyncHandler(orderController.createOrder));

// 2. GET /api/orders/:id/status - Status pesanan real-time pelanggan
router.get('/:id/status', asyncHandler(orderController.getOrderStatus));

// 3. GET /api/orders/dashboard-summary - Ringkasan statistik dashboard admin
router.get('/dashboard-summary', verifikasiToken, asyncHandler(orderController.getDashboardSummary));

// 4. GET /api/orders - Daftar seluruh pesanan (Admin FIFO)
router.get('/', verifikasiToken, asyncHandler(orderController.getAllOrders));

// 5. PATCH /api/orders/:id/status - Update status pesanan linier (Admin)
router.patch('/:id/status', verifikasiToken, asyncHandler(orderController.updateOrderStatus));

// 6. POST /api/orders/notification - Webhook notifikasi Midtrans
router.post('/notification', asyncHandler(orderController.handleMidtransNotification));

// 7. POST /api/orders/:id/mark-paid - Menandai lunas manual (Admin)
router.post('/:id/mark-paid', verifikasiToken, asyncHandler(orderController.markOrderAsPaid));

// 8. POST /api/orders/:id/update-payment-client - Fallback callback payment dari client
router.post('/:id/update-payment-client', asyncHandler(orderController.updatePaymentFromClient));

// 9. DELETE /api/orders/today - Menghapus seluruh pesanan (Admin)
router.delete('/today', verifikasiToken, asyncHandler(orderController.deleteAllOrders));

module.exports = router;
