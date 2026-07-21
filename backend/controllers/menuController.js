/**
 * ==============================================================================
 * CONTROLLER MANAJEMEN MENU (backend/controllers/menuController.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * Controller ini menangani seluruh alur kerja produk/menu kafe (penyajian daftar menu,
 * penambahan menu baru, pengubahan varian hot/ice, dan penghapusan menu).
 * 
 * ALUR KERJA (DATA FLOW):
 * 1. Menerima data produk dari Admin atau permintaan daftar menu dari Pelanggan.
 * 2. Mengkalkulasi harga dasar menu (base price) jika menu memiliki varian Hot & Ice.
 * 3. Menjalankan query SQL ke tabel `menu`.
 * 4. Mengembalikan respon JSON terstruktur.
 * ==============================================================================
 */

const db = require('../db');

/**
 * 1. Mendapatkan seluruh daftar menu
 * GET /api/menu
 */
async function getAllMenu(req, res) {
  const resMenu = await db.query('SELECT * FROM menu ORDER BY kategori, nama');
  res.json(resMenu.rows);
}

/**
 * 2. Mendapatkan detail satu menu berdasarkan ID
 * GET /api/menu/:id
 */
async function getMenuById(req, res) {
  const { id } = req.params;
  const resMenu = await db.query('SELECT * FROM menu WHERE id = $1', [id]);

  if (resMenu.rows.length === 0) {
    return res.status(404).json({ pesan: 'Menu tidak ditemukan.' });
  }

  res.json(resMenu.rows[0]);
}

/**
 * Helper untuk menghitung harga dasar (base price) menu
 * @param {boolean} isHotIce 
 * @param {number} harga 
 * @param {number} hargaHot 
 * @param {number} hargaIce 
 */
function calculateBasePrice(isHotIce, harga, hargaHot, hargaIce) {
  if (isHotIce) {
    return Math.min(parseInt(hargaHot || 0, 10), parseInt(hargaIce || 0, 10));
  }
  return parseInt(harga || 0, 10);
}

/**
 * 3. Menambahkan menu baru (Akses Admin)
 * POST /api/menu
 */
async function createMenu(req, res) {
  const { nama, harga, gambar, kategori, deskripsi, is_hot_ice, harga_hot, harga_ice, is_favorit } = req.body;

  // Validasi input wajib
  if (!nama || !kategori || (!is_hot_ice && !harga)) {
    return res.status(400).json({ pesan: 'Nama, kategori, dan harga wajib diisi.' });
  }

  // Validasi khusus varian
  if (is_hot_ice && (!harga_hot || !harga_ice)) {
    return res.status(400).json({ pesan: 'Harga hot dan ice wajib diisi jika menu memiliki varian.' });
  }

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
    is_hot_ice ? parseInt(harga_hot || 0, 10) : null,
    is_hot_ice ? parseInt(harga_ice || 0, 10) : null,
    !!is_favorit
  ];
  
  const resInsert = await db.query(queryStr, values);
  res.status(201).json({
    pesan: 'Menu baru berhasil ditambahkan.',
    menu: resInsert.rows[0]
  });
}

/**
 * 4. Mengubah data menu berdasarkan ID (Akses Admin)
 * PUT /api/menu/:id
 */
async function updateMenu(req, res) {
  const { id } = req.params;
  const { nama, harga, gambar, kategori, deskripsi, is_hot_ice, harga_hot, harga_ice, is_favorit } = req.body;

  if (!nama || !kategori || (!is_hot_ice && !harga)) {
    return res.status(400).json({ pesan: 'Nama, kategori, dan harga wajib diisi.' });
  }
  if (is_hot_ice && (!harga_hot || !harga_ice)) {
    return res.status(400).json({ pesan: 'Harga hot dan ice wajib diisi jika menu memiliki varian.' });
  }

  // Memeriksa keberadaan menu
  const checkMenu = await db.query('SELECT id FROM menu WHERE id = $1', [id]);
  if (checkMenu.rows.length === 0) {
    return res.status(404).json({ pesan: 'Menu tidak ditemukan.' });
  }

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
    is_hot_ice ? parseInt(harga_hot || 0, 10) : null,
    is_hot_ice ? parseInt(harga_ice || 0, 10) : null,
    !!is_favorit,
    id
  ];

  const resUpdate = await db.query(queryStr, values);
  res.json({
    pesan: 'Menu berhasil diperbarui.',
    menu: resUpdate.rows[0]
  });
}

/**
 * 5. Menghapus menu berdasarkan ID (Akses Admin)
 * DELETE /api/menu/:id
 */
async function deleteMenu(req, res) {
  const { id } = req.params;

  // Memeriksa keberadaan menu
  const checkMenu = await db.query('SELECT id FROM menu WHERE id = $1', [id]);
  if (checkMenu.rows.length === 0) {
    return res.status(404).json({ pesan: 'Menu tidak ditemukan.' });
  }

  await db.query('DELETE FROM menu WHERE id = $1', [id]);
  res.json({ pesan: 'Menu berhasil dihapus.' });
}

module.exports = {
  getAllMenu,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu
};
