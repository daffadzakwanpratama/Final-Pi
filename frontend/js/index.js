/**
 * ==============================================================================
 * SKRIP HALAMAN UTAMA / LANDING PAGE (frontend/js/index.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini mengelola halaman pemungkas/landing tempat pelanggan memilih nomor meja:
 * 1. Mendeteksi simulasi scan QR code dari URL parameter (`?meja=X`).
 * 2. Menyimpan nomor meja terpilih ke LocalStorage (`nomor_meja`).
 * 3. Mengarahkan pelanggan ke halaman katalog menu (`menu.html`).
 * ==============================================================================
 */

lucide.createIcons();

// 1. Deteksi parameter meja dari URL (Simulasi Scan QR Code)
const urlParams = new URLSearchParams(window.location.search);
const paramMeja = urlParams.get('meja');

if (paramMeja && parseInt(paramMeja, 10) > 0) {
  localStorage.setItem('nomor_meja', paramMeja);
  window.location.href = `menu.html?meja=${paramMeja}`;
}

/**
 * 2. Menyimpan nomor meja terpilih secara manual
 * @param {number|string} nomor 
 */
function selectMeja(nomor) {
  localStorage.setItem('nomor_meja', nomor);
  window.location.href = `menu.html?meja=${nomor}`;
}
