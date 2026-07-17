// =================================================================
// Skrip Halaman Landing & Pemilihan Meja Pelanggan (index.js)
// Deskripsi: Menginisialisasi ikon halaman, mendeteksi parameter meja 
//            dari URL (simulasi scan QR code), dan mengarahkan ke menu.
// =================================================================

// Inisialisasi ikon Lucide di halaman landing
lucide.createIcons();

// 1. Deteksi parameter meja di URL (Simulasi Scan QR)
// Deskripsi: Jika pelanggan mengakses dengan parameter URL ?meja=X, simpan di localStorage dan arahkan ke menu.html
const urlParams = new URLSearchParams(window.location.search);
const paramMeja = urlParams.get('meja');
if (paramMeja && parseInt(paramMeja) > 0) {
  localStorage.setItem('nomor_meja', paramMeja);
  window.location.href = `menu.html?meja=${paramMeja}`;
}

// 2. Fungsi selectMeja
// Deskripsi: Menyimpan nomor meja yang dipilih secara manual oleh pelanggan dan mengarahkan ke halaman menu
function selectMeja(nomor) {
  localStorage.setItem('nomor_meja', nomor);
  window.location.href = `menu.html?meja=${nomor}`;
}
