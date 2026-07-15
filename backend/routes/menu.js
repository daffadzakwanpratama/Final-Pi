// Rute CRUD Menu (Pelanggan & Admin)
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifikasiToken = require('../middleware/auth');

// 1. GET /api/menu
// Deskripsi: Mendapatkan seluruh daftar menu
router.get('/', async (req, res) => {
  try {
    const resMenu = await db.query('SELECT * FROM menu ORDER BY kategori, nama');
    res.json(resMenu.rows);
  } catch (error) {
    console.error('Error GET /api/menu:', error);
    res.status(500).json({ pesan: 'Gagal mengambil daftar menu.' });
  }
});

// 2. GET /api/menu/:id
// Deskripsi: Mendapatkan detail satu menu berdasarkan ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const resMenu = await db.query('SELECT * FROM menu WHERE id = $1', [id]);
    if (resMenu.rows.length === 0) {
      return res.status(404).json({ pesan: 'Menu tidak ditemukan.' });
    }
    res.json(resMenu.rows[0]);
  } catch (error) {
    console.error('Error GET /api/menu/:id:', error);
    res.status(500).json({ pesan: 'Gagal mengambil detail menu.' });
  }
});

// 3. POST /api/menu
// Deskripsi: Menambahkan menu baru (Akses Admin)
router.post('/', verifikasiToken, async (req, res) => {
  const { nama, harga, gambar, kategori } = req.body;

  if (!nama || !harga || !kategori) {
    return res.status(400).json({ pesan: 'Nama, harga, dan kategori wajib diisi.' });
  }

  try {
    const queryStr = 'INSERT INTO menu (nama, harga, gambar, kategori) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [nama, parseInt(harga), gambar || '', kategori];
    
    const resInsert = await db.query(queryStr, values);
    res.status(201).json({
      pesan: 'Menu baru berhasil ditambahkan.',
      menu: resInsert.rows[0]
    });
  } catch (error) {
    console.error('Error POST /api/menu:', error);
    res.status(500).json({ pesan: 'Gagal menambahkan menu.' });
  }
});

// 4. PUT /api/menu/:id
// Deskripsi: Mengubah data menu berdasarkan ID (Akses Admin)
router.put('/:id', verifikasiToken, async (req, res) => {
  const { id } = req.params;
  const { nama, harga, gambar, kategori } = req.body;

  if (!nama || !harga || !kategori) {
    return res.status(400).json({ pesan: 'Nama, harga, dan kategori wajib diisi.' });
  }

  try {
    // Memeriksa keberadaan menu
    const checkMenu = await db.query('SELECT * FROM menu WHERE id = $1', [id]);
    if (checkMenu.rows.length === 0) {
      return res.status(404).json({ pesan: 'Menu tidak ditemukan.' });
    }

    const queryStr = 'UPDATE menu SET nama = $1, harga = $2, gambar = $3, kategori = $4 WHERE id = $5 RETURNING *';
    const values = [nama, parseInt(harga), gambar || '', kategori, id];

    const resUpdate = await db.query(queryStr, values);
    res.json({
      pesan: 'Menu berhasil diperbarui.',
      menu: resUpdate.rows[0]
    });
  } catch (error) {
    console.error('Error PUT /api/menu/:id:', error);
    res.status(500).json({ pesan: 'Gagal memperbarui menu.' });
  }
});

// 5. DELETE /api/menu/:id
// Deskripsi: Menghapus menu berdasarkan ID (Akses Admin)
router.delete('/:id', verifikasiToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Memeriksa keberadaan menu
    const checkMenu = await db.query('SELECT * FROM menu WHERE id = $1', [id]);
    if (checkMenu.rows.length === 0) {
      return res.status(404).json({ pesan: 'Menu tidak ditemukan.' });
    }

    await db.query('DELETE FROM menu WHERE id = $1', [id]);
    res.json({ pesan: 'Menu berhasil dihapus.' });
  } catch (error) {
    console.error('Error DELETE /api/menu/:id:', error);
    res.status(500).json({ pesan: 'Gagal menghapus menu.' });
  }
});

module.exports = router;
