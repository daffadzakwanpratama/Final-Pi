/**
 * ==============================================================================
 * RUTE MANAJEMEN MENU (backend/routes/menu.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini mendefinisikan endpoint HTTP untuk operasi CRUD menu/produk kafe.
 * 
 * ALUR KERJA (DATA FLOW):
 * 1. GET /api/menu -> `menuController.getAllMenu` (Publik)
 * 2. GET /api/menu/:id -> `menuController.getMenuById` (Publik)
 * 3. POST /api/menu -> `verifikasiToken` -> `menuController.createMenu` (Admin)
 * 4. PUT /api/menu/:id -> `verifikasiToken` -> `menuController.updateMenu` (Admin)
 * 5. DELETE /api/menu/:id -> `verifikasiToken` -> `menuController.deleteMenu` (Admin)
 * ==============================================================================
 */

const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const verifikasiToken = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// 1. GET /api/menu - Mendapatkan seluruh daftar menu
router.get('/', asyncHandler(menuController.getAllMenu));

// 2. GET /api/menu/:id - Mendapatkan detail satu menu berdasarkan ID
router.get('/:id', asyncHandler(menuController.getMenuById));

// 3. POST /api/menu - Menambahkan menu baru (Admin)
router.post('/', verifikasiToken, asyncHandler(menuController.createMenu));

// 4. PUT /api/menu/:id - Mengubah data menu berdasarkan ID (Admin)
router.put('/:id', verifikasiToken, asyncHandler(menuController.updateMenu));

// 5. DELETE /api/menu/:id - Menghapus menu berdasarkan ID (Admin)
router.delete('/:id', verifikasiToken, asyncHandler(menuController.deleteMenu));

module.exports = router;
