/**
 * ==============================================================================
 * CONTROLLER MANAJEMEN KATEGORI MENU (backend/controllers/categoryController.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini bertindak sebagai pelaksana operasi CRUD untuk kategori produk:
 * 1. getAllCategories: Mengambil semua data kategori dari database PostgreSQL.
 * 2. createCategory: Menambahkan kategori baru (memeriksa duplikasi nama).
 * 3. updateCategory: Mengubah nama kategori berdasarkan ID.
 * 4. deleteCategory: Menghapus kategori tertentu berdasarkan ID.
 * 
 * ALUR KERJA (DATA FLOW):
 * Masuk dari: Request HTTP yang diarahkan oleh `backend/routes/categories.js`
 * Keluar ke: Respon JSON hasil query PostgreSQL ke client (frontend admin/klien).
 * ==============================================================================
 */

const db = require('../db');

// GET /api/categories
async function getAllCategories(req, res) {
  const resCat = await db.query('SELECT * FROM categories ORDER BY nama');
  res.json(resCat.rows);
}

// POST /api/categories
async function createCategory(req, res) {
  const { nama } = req.body;
  if (!nama || !nama.trim()) {
    return res.status(400).json({ pesan: 'Nama kategori tidak boleh kosong.' });
  }

  const categoryName = nama.trim();
  const checkCat = await db.query('SELECT id FROM categories WHERE nama = $1', [categoryName]);
  if (checkCat.rows.length > 0) {
    return res.status(400).json({ pesan: 'Nama kategori sudah terdaftar.' });
  }

  const resInsert = await db.query(
    'INSERT INTO categories (nama) VALUES ($1) RETURNING *',
    [categoryName]
  );

  res.status(201).json({
    pesan: 'Kategori baru berhasil ditambahkan.',
    category: resInsert.rows[0]
  });
}

// PUT /api/categories/:id
async function updateCategory(req, res) {
  const { id } = req.params;
  const { nama } = req.body;

  if (!nama || !nama.trim()) {
    return res.status(400).json({ pesan: 'Nama kategori tidak boleh kosong.' });
  }

  const categoryName = nama.trim();

  // Memeriksa apakah nama baru sudah dipakai oleh kategori lain
  const checkDuplicate = await db.query(
    'SELECT id FROM categories WHERE nama = $1 AND id <> $2',
    [categoryName, id]
  );
  if (checkDuplicate.rows.length > 0) {
    return res.status(400).json({ pesan: 'Nama kategori sudah digunakan.' });
  }

  const resUpdate = await db.query(
    'UPDATE categories SET nama = $1 WHERE id = $2 RETURNING *',
    [categoryName, id]
  );

  if (resUpdate.rows.length === 0) {
    return res.status(404).json({ pesan: 'Kategori tidak ditemukan.' });
  }

  res.json({
    pesan: 'Kategori berhasil diperbarui.',
    category: resUpdate.rows[0]
  });
}

// DELETE /api/categories/:id
async function deleteCategory(req, res) {
  const { id } = req.params;
  const resDelete = await db.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
  if (resDelete.rows.length === 0) {
    return res.status(404).json({ pesan: 'Kategori tidak ditemukan.' });
  }

  res.json({ pesan: 'Kategori berhasil dihapus.' });
}

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
