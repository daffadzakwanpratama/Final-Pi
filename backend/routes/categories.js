// Rute CRUD Kategori (Pelanggan & Admin)
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifikasiToken = require('../middleware/auth');

// 1. GET /api/categories
// Deskripsi: Mendapatkan seluruh daftar kategori
router.get('/', async (req, res) => {
  try {
    const resCat = await db.query('SELECT * FROM categories ORDER BY nama');
    res.json(resCat.rows);
  } catch (error) {
    console.error('Error GET /api/categories:', error);
    res.status(500).json({ pesan: 'Gagal mengambil daftar kategori.' });
  }
});

// 2. POST /api/categories
// Deskripsi: Menambahkan kategori baru (Akses Admin)
router.post('/', verifikasiToken, async (req, res) => {
  const { nama } = req.body;

  if (!nama || nama.trim() === '') {
    return res.status(400).json({ pesan: 'Nama kategori tidak boleh kosong.' });
  }

  try {
    const checkCat = await db.query('SELECT * FROM categories WHERE nama = $1', [nama.trim()]);
    if (checkCat.rows.length > 0) {
      return res.status(400).json({ pesan: 'Nama kategori sudah terdaftar.' });
    }

    const resInsert = await db.query(
      'INSERT INTO categories (nama) VALUES ($1) RETURNING *',
      [nama.trim()]
    );
    res.status(201).json({
      pesan: 'Kategori baru berhasil ditambahkan.',
      category: resInsert.rows[0]
    });
  } catch (error) {
    console.error('Error POST /api/categories:', error);
    res.status(500).json({ pesan: 'Gagal menambahkan kategori.' });
  }
});

// 3. PUT /api/categories/:id
// Deskripsi: Mengubah nama kategori berdasarkan ID (Akses Admin)
router.put('/:id', verifikasiToken, async (req, res) => {
  const { id } = req.params;
  const { nama } = req.body;

  if (!nama || nama.trim() === '') {
    return res.status(400).json({ pesan: 'Nama kategori tidak boleh kosong.' });
  }

  try {
    // Memeriksa keberadaan kategori
    const checkCat = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (checkCat.rows.length === 0) {
      return res.status(404).json({ pesan: 'Kategori tidak ditemukan.' });
    }

    const checkDuplicate = await db.query(
      'SELECT * FROM categories WHERE nama = $1 AND id <> $2',
      [nama.trim(), id]
    );
    if (checkDuplicate.rows.length > 0) {
      return res.status(400).json({ pesan: 'Nama kategori sudah digunakan.' });
    }

    const resUpdate = await db.query(
      'UPDATE categories SET nama = $1 WHERE id = $2 RETURNING *',
      [nama.trim(), id]
    );
    res.json({
      pesan: 'Kategori berhasil diperbarui.',
      category: resUpdate.rows[0]
    });
  } catch (error) {
    console.error('Error PUT /api/categories/:id:', error);
    res.status(500).json({ pesan: 'Gagal memperbarui kategori.' });
  }
});

// 4. DELETE /api/categories/:id
// Deskripsi: Menghapus kategori berdasarkan ID (Akses Admin)
router.delete('/:id', verifikasiToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Memeriksa keberadaan kategori
    const checkCat = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (checkCat.rows.length === 0) {
      return res.status(404).json({ pesan: 'Kategori tidak ditemukan.' });
    }

    await db.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ pesan: 'Kategori berhasil dihapus.' });
  } catch (error) {
    console.error('Error DELETE /api/categories/:id:', error);
    res.status(500).json({ pesan: 'Gagal menghapus kategori.' });
  }
});

module.exports = router;
