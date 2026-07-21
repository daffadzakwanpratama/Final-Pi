/**
 * ==============================================================================
 * RUTE KATEGORI (backend/routes/categories.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini mendefinisikan endpoint HTTP untuk operasi CRUD kategori produk.
 * 
 * ALUR KERJA (DATA FLOW):
 * 1. GET /api/categories -> `categoryController.getAllCategories` (Publik)
 * 2. POST /api/categories -> `verifikasiToken` -> `categoryController.createCategory` (Admin)
 * 3. PUT /api/categories/:id -> `verifikasiToken` -> `categoryController.updateCategory` (Admin)
 * 4. DELETE /api/categories/:id -> `verifikasiToken` -> `categoryController.deleteCategory` (Admin)
 * ==============================================================================
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const verifikasiToken = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// 1. GET /api/categories - Mendapatkan seluruh daftar kategori
router.get('/', asyncHandler(categoryController.getAllCategories));

// 2. POST /api/categories - Menambahkan kategori baru (Admin)
router.post('/', verifikasiToken, asyncHandler(categoryController.createCategory));

// 3. PUT /api/categories/:id - Mengubah nama kategori berdasarkan ID (Admin)
router.put('/:id', verifikasiToken, asyncHandler(categoryController.updateCategory));

// 4. DELETE /api/categories/:id - Menghapus kategori berdasarkan ID (Admin)
router.delete('/:id', verifikasiToken, asyncHandler(categoryController.deleteCategory));

module.exports = router;
