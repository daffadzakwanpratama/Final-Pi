/**
 * ==============================================================================
 * CONTROLLER KATEGORI MENU (backend/controllers/categoryController.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * Controller ini mengelola logika CRUD (Create, Read, Update, Delete) untuk 
 * kategori produk (misalnya: Makanan, Minuman, Snack).
 * 
 * ALUR KERJA (DATA FLOW):
 * 1. Menerima request HTTP dari frontend (Admin / Pelanggan).
 * 2. Melakukan validasi data input.
 * 3. Menjalankan query SQL ke tabel `categories`.
 * 4. Mengembalikan respon berformat JSON yang sesuai.
 * ==============================================================================
 */

const db = require('../db');

/**
 * 1. Mendapatkan seluruh daftar kategori
 * GET /api/categories
 */
async function getAllCategories(req, res) {
  const resCat = await db.query('SELECT * FROM categories ORDER BY nama');
  res.json(resCat.rows);
}

/**
 * 2. Menambahkan kategori baru (Akses Admin)
 * POST /api/categories
 */
async function createCategory(req, res) {
  const { nama } = req.body;

  if (!nama || nama.trim() === '') {
    return res.status(400).json({ pesan: 'Nama kategori tidak boleh kosong.' });
  }

  const categoryName = nama.trim();

  // Cek duplikasi nama kategori
  const checkCat = await db.query('SELECT id FROM categories WHERE nama = $1', [categoryName]);
  if (checkCat.rows.length > 0) {
    return res.status(400).json({ pesan: 'Nama kategori sudah terdaftar.' });
  }

  // Insert ke database
  const resInsert = await db.query(
    'INSERT INTO categories (nama) VALUES ($1) RETURNING *',
    [categoryName]
  );

  res.status(201).json({
    pesan: 'Kategori baru berhasil ditambahkan.',
    category: resInsert.rows[0]
  });
}

/**
 * 3. Mengubah nama kategori berdasarkan ID (Akses Admin)
 * PUT /api/categories/:id
 */
async function updateCategory(req, res) {
  const { id } = req.params;
  const { nama } = req.body;

  if (!nama || nama.trim() === '') {
    return res.status(400).json({ pesan: 'Nama kategori tidak boleh kosong.' });
  }

  const categoryName = nama.trim();

  // Memeriksa keberadaan kategori
  const checkCat = await db.query('SELECT id FROM categories WHERE id = $1', [id]);
  if (checkCat.rows.length === 0) {
    return res.status(404).json({ pesan: 'Kategori tidak ditemukan.' });
  }

  // Memeriksa apakah nama baru sudah dipakai oleh kategori lain
  const checkDuplicate = await db.query(
    'SELECT id FROM categories WHERE nama = $1 AND id <> $2',
    [categoryName, id]
  );
  if (checkDuplicate.rows.length > 0) {
    return res.status(400).json({ pesan: 'Nama kategori sudah digunakan.' });
  }

  // Update nama kategori
  const resUpdate = await db.query(
    'UPDATE categories SET nama = $1 WHERE id = $2 RETURNING *',
    [categoryName, id]
  );

  res.json({
    pesan: 'Kategori berhasil diperbarui.',
    category: resUpdate.rows[0]
  });
}

/**
 * 4. Menghapus kategori berdasarkan ID (Akses Admin)
 * DELETE /api/categories/:id
 */
async function deleteCategory(req, res) {
  const { id } = req.params;

  // Memeriksa keberadaan kategori
  const checkCat = await db.query('SELECT id FROM categories WHERE id = $1', [id]);
  if (checkCat.rows.length === 0) {
    return res.status(404).json({ pesan: 'Kategori tidak ditemukan.' });
  }

  // Hapus dari database
  await db.query('DELETE FROM categories WHERE id = $1', [id]);
  res.json({ pesan: 'Kategori berhasil dihapus.' });
}

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
