/**
 * ==============================================================================
 * CONTROLLER MANAJEMEN MENU RESTORAN (backend/controllers/menuController.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini mengelola operasi CRUD menu makanan dan minuman:
 * 1. getAllMenu: Mengambil katalog menu dan mengkalkulasikan harga dasar.
 * 2. getMenuById: Mengambil rincian menu spesifik untuk modal detail pelanggan.
 * 3. createMenu / updateMenu: Membuat/mengubah produk (termasuk varian Hot/Ice & favorit).
 * 4. deleteMenu: Menghapus menu dari database berdasarkan ID.
 * 
 * ALUR KERJA (DATA FLOW):
 * Masuk dari: Request HTTP yang diarahkan oleh `backend/routes/menu.js`
 * Keluar ke: Mengirim data menu atau status transaksi (sukses/gagal) ke frontend.
 * ==============================================================================
 */

const db = require('../db');

/**
 * Hitung harga dasar (base price) menu
 */
function calculateBasePrice(isHotIce, harga, hargaHot, hargaIce) {
  if (isHotIce) {
    return Math.min(Number(hargaHot || 0), Number(hargaIce || 0));
  }
  return Number(harga || 0);
}

/**
 * Validasi payload menu
 */
function validateMenuInput(body) {
  const { nama, harga, kategori, is_hot_ice, harga_hot, harga_ice } = body;
  if (!nama || !kategori || (!is_hot_ice && !harga)) {
    return 'Nama, kategori, dan harga wajib diisi.';
  }
  if (is_hot_ice && (!harga_hot || !harga_ice)) {
    return 'Harga hot dan ice wajib diisi jika menu memiliki varian.';
  }
  return null;
}

// GET /api/menu
async function getAllMenu(req, res) {
  const resMenu = await db.query('SELECT * FROM menu ORDER BY kategori, nama');
  res.json(resMenu.rows);
}

// GET /api/menu/:id
async function getMenuById(req, res) {
  const { id } = req.params;
  const resMenu = await db.query('SELECT * FROM menu WHERE id = $1', [id]);
  if (resMenu.rows.length === 0) {
    return res.status(404).json({ pesan: 'Menu tidak ditemukan.' });
  }
  res.json(resMenu.rows[0]);
}

// POST /api/menu
async function createMenu(req, res) {
  const errorPesan = validateMenuInput(req.body);
  if (errorPesan) {
    return res.status(400).json({ pesan: errorPesan });
  }

  const { nama, harga, gambar, kategori, deskripsi, is_hot_ice, harga_hot, harga_ice, is_favorit } = req.body;
  const baseHarga = calculateBasePrice(is_hot_ice, harga, harga_hot, harga_ice);

  const queryStr = `
    INSERT INTO menu (nama, harga, gambar, kategori, deskripsi, is_hot_ice, harga_hot, harga_ice, is_favorit) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
    RETURNING *
  `;
  const values = [
    nama,
    baseHarga,
    gambar || '',
    kategori,
    deskripsi || '',
    !!is_hot_ice,
    is_hot_ice ? Number(harga_hot) : null,
    is_hot_ice ? Number(harga_ice) : null,
    !!is_favorit
  ];

  const resInsert = await db.query(queryStr, values);
  res.status(201).json({
    pesan: 'Menu baru berhasil ditambahkan.',
    menu: resInsert.rows[0]
  });
}

// PUT /api/menu/:id
async function updateMenu(req, res) {
  const { id } = req.params;
  const errorPesan = validateMenuInput(req.body);
  if (errorPesan) {
    return res.status(400).json({ pesan: errorPesan });
  }

  const { nama, harga, gambar, kategori, deskripsi, is_hot_ice, harga_hot, harga_ice, is_favorit } = req.body;
  const baseHarga = calculateBasePrice(is_hot_ice, harga, harga_hot, harga_ice);

  const queryStr = `
    UPDATE menu 
    SET nama = $1, harga = $2, gambar = $3, kategori = $4, deskripsi = $5, is_hot_ice = $6, harga_hot = $7, harga_ice = $8, is_favorit = $9 
    WHERE id = $10 
    RETURNING *
  `;
  const values = [
    nama,
    baseHarga,
    gambar || '',
    kategori,
    deskripsi || '',
    !!is_hot_ice,
    is_hot_ice ? Number(harga_hot) : null,
    is_hot_ice ? Number(harga_ice) : null,
    !!is_favorit,
    id
  ];

  const resUpdate = await db.query(queryStr, values);
  if (resUpdate.rows.length === 0) {
    return res.status(404).json({ pesan: 'Menu tidak ditemukan.' });
  }

  res.json({
    pesan: 'Menu berhasil diperbarui.',
    menu: resUpdate.rows[0]
  });
}

// DELETE /api/menu/:id
async function deleteMenu(req, res) {
  const { id } = req.params;
  const resDelete = await db.query('DELETE FROM menu WHERE id = $1 RETURNING id', [id]);
  if (resDelete.rows.length === 0) {
    return res.status(404).json({ pesan: 'Menu tidak ditemukan.' });
  }

  res.json({ pesan: 'Menu berhasil dihapus.' });
}

module.exports = {
  getAllMenu,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu
};
