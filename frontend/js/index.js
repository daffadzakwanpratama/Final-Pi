// Inisialisasi ikon Lucide
lucide.createIcons();

// Deteksi parameter meja di URL (Simulasi Scan QR)
const urlParams = new URLSearchParams(window.location.search);
const paramMeja = urlParams.get('meja');
if (paramMeja && parseInt(paramMeja) > 0) {
  localStorage.setItem('nomor_meja', paramMeja);
  window.location.href = `menu.html?meja=${paramMeja}`;
}

// Fungsi untuk memilih meja secara manual
function selectMeja(nomor) {
  localStorage.setItem('nomor_meja', nomor);
  window.location.href = `menu.html?meja=${nomor}`;
}
