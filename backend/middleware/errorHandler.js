/**
 * ==============================================================================
 * MIDDLEWARE PENANGANAN ERROR GLOBAL (backend/middleware/errorHandler.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * Middleware ini berfungsi menangkap semua kesalahan (uncaught exceptions / rejected promises)
 * yang terjadi di dalam rute/controller Express.
 * 
 * MENGAPA PENTING (Prinsip Clean Code - Centralized Error Handling):
 * 1. Mencegah duplikasi kode `try-catch` dan formatting error di setiap endpoint.
 * 2. Memastikan format respon error HTTP selalu konsisten di seluruh API.
 * 3. Menyembunyikan rincian stack trace internal server dari publik saat produksi.
 * ==============================================================================
 */

/**
 * Middleware Error Handler Express (harus menerima 4 argumen: err, req, res, next)
 */
function globalErrorHandler(err, req, res, next) {
  console.error(`[Error Handler] ${req.method} ${req.originalUrl}:`, err.stack || err.message || err);

  const statusCode = err.statusCode || 500;
  const pesan = err.message || 'Terjadi kesalahan internal pada server.';

  res.status(statusCode).json({
    sukses: false,
    pesan: pesan,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Helper async wrapper untuk membungkus fungsi async controller
 * Mencegah perlunya menulis `try-catch` berulang di setiap fungsi controller.
 * 
 * @param {Function} fn - Fungsi async controller
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  globalErrorHandler,
  asyncHandler
};
