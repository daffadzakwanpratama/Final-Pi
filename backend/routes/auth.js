/**
 * ==============================================================================
 * RUTE AUTENTIKASI ADMIN (backend/routes/auth.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini mendefinisikan endpoint HTTP untuk fitur autentikasi.
 * 
 * ALUR KERJA (DATA FLOW):
 * POST /api/auth/login -> Dipaketkan ke `authController.login` dengan penangan error otomatis (`asyncHandler`).
 * ==============================================================================
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { asyncHandler } = require('../middleware/errorHandler');

// POST /api/auth/login - Login admin dan mendapatkan token JWT
router.post('/login', asyncHandler(authController.login));

module.exports = router;
