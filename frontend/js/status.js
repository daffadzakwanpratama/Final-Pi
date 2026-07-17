// =================================================================
// Skrip Pemantauan Status Pesanan Pelanggan (status.js)
// Deskripsi: Melakukan polling real-time ke API backend untuk memantau 
//            status pesanan, status pembayaran, dan memperbarui UI.
// =================================================================

// 1. Inisialisasi Parameter Halaman
// Mengambil ID pesanan dari query parameter URL (?id=X)
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('id');
if (!orderId) { 
  window.location.href = 'menu.html'; 
}

// Tampilkan ID Pesanan pada header dan inisialisasi ikon Lucide
document.getElementById('orderIdText').textContent = `#${orderId}`;
lucide.createIcons();

// 2. Fungsi dapatkanStatus
// Deskripsi: Mengambil data status pesanan terbaru dari API backend
async function dapatkanStatus() {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    perbaruiUI(data);
  } catch {
    document.getElementById('statusAlertBox').innerHTML =
      `<span style="color:var(--status-waiting-text)">Koneksi terputus. Mencoba lagi...</span>`;
  }
}

// 3. Fungsi perbaruiUI
// Deskripsi: Memperbarui seluruh elemen UI berdasarkan status pesanan & pembayaran terbaru
function perbaruiUI(data) {
  const order = data.order;
  const items = data.items;

  // Format waktu lokal (WIB) dan perbarui info pelanggan/nomor meja
  const waktu = new Date(order.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('waktuText').textContent = `${order.nama_pelanggan || 'Pelanggan'} • Meja ${order.nomor_meja} • Pukul ${waktu} WIB`;
  document.getElementById('mejaBadge').textContent = `Meja ${order.nomor_meja}`;

  // Memperbarui Kartu Detail Pembayaran
  if (order.metode_pembayaran) {
    document.getElementById('pembayaranCard').style.display = 'block';
    document.getElementById('metodePembayaranVal').textContent = order.metode_pembayaran === 'nontunai' ? 'Non-Tunai (Online)' : 'Tunai di Kasir';

    const pBadge = document.getElementById('statusPembayaranBadge');
    pBadge.textContent = order.status_pembayaran;
    
    // Reset kelas/style badge status pembayaran
    pBadge.className = 'badge';
    pBadge.style.background = '';
    pBadge.style.color = '';
    pBadge.style.borderColor = '';

    if (order.status_pembayaran === 'Sudah Bayar') {
      pBadge.classList.add('badge-selesai');
      document.getElementById('btnBayarUlangContainer').style.display = 'none';
    } else if (order.status_pembayaran === 'Belum Bayar') {
      pBadge.classList.add('badge-menunggu');
      // Jika pembayaran online nontunai belum dibayar, tampilkan tombol bayar ulang via Midtrans
      if (order.metode_pembayaran === 'nontunai' && order.midtrans_token) {
        document.getElementById('btnBayarUlangContainer').style.display = 'block';
        document.getElementById('btnBayarUlang').onclick = function() {
          snap.pay(order.midtrans_token, {
            onSuccess: function(result) {
              fetch(`/api/orders/${order.id}/update-payment-client`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status_pembayaran: 'Sudah Bayar' })
              }).then(() => {
                dapatkanStatus();
              }).catch(() => {
                dapatkanStatus();
              });
            },
            onPending: function(result) {
              fetch(`/api/orders/${order.id}/update-payment-client`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status_pembayaran: 'Belum Bayar' })
              }).then(() => {
                dapatkanStatus();
              }).catch(() => {
                dapatkanStatus();
              });
            },
            onError: function(result) { dapatkanStatus(); },
            onClose: function() { dapatkanStatus(); }
          });
        };
      } else {
        document.getElementById('btnBayarUlangContainer').style.display = 'none';
      }
    } else {
      // Pembayaran Gagal / Kadaluwarsa (Expired)
      pBadge.style.background = '#fde8e8';
      pBadge.style.color = '#9b1c1c';
      pBadge.style.borderColor = '#f8b4b4';
      document.getElementById('btnBayarUlangContainer').style.display = 'none';
    }
  } else {
    document.getElementById('pembayaranCard').style.display = 'none';
  }

  // Memperbarui Daftar Detail Menu Pesanan
  let total = 0;
  document.getElementById('orderItemsList').innerHTML = items.map(item => {
    total += item.subtotal;
    const vText = item.varian ? ` (${item.varian})` : '';
    return `<div class="order-item-row">
      <span>${item.nama || 'Menu'}${vText} <strong style="color:var(--coffee-600)">×${item.qty}</strong></span>
      <span style="font-weight:600;">Rp ${item.subtotal.toLocaleString('id-ID')}</span>
    </div>`;
  }).join('');
  document.getElementById('totalHargaText').textContent = `Rp ${total.toLocaleString('id-ID')}`;

  // Memperbarui Tracker Alur Pesanan (Progress Steps)
  const urutanStatus = ['Menunggu', 'Diproses', 'Siap', 'Selesai'];
  const idxAktif = urutanStatus.indexOf(order.status);

  urutanStatus.forEach((s, idx) => {
    const el = document.getElementById(`step-${s}`);
    el.classList.remove('active', 'done');
    if (idx < idxAktif) el.classList.add('done');
    if (idx === idxAktif) el.classList.add('active');
  });

  // Memperbarui Kotak Alert/Pemberitahuan Status Utama
  const alert = document.getElementById('statusAlertBox');
  const configs = {
    'Menunggu': { bg: 'var(--status-waiting-bg)', color: 'var(--status-waiting-text)', border: 'var(--status-waiting-border)', icon: 'clock', msg: 'Pesanan Anda diterima. Sedang menunggu konfirmasi.' },
    'Diproses': { bg: 'var(--status-process-bg)', color: 'var(--status-process-text)', border: 'var(--status-process-border)', icon: 'coffee', msg: 'Pesanan Anda sedang diracik oleh barista.' },
    'Siap': { bg: 'var(--status-ready-bg)', color: 'var(--status-ready-text)', border: 'var(--status-ready-border)', icon: 'bell', msg: 'Pesanan SIAP! Silakan ambil di kasir.' },
    'Selesai': { bg: 'var(--status-done-bg)', color: 'var(--status-done-text)', border: 'var(--status-done-border)', icon: 'circle-check', msg: 'Selesai! Terima kasih sudah berkunjung.' },
  };
  const cfg = configs[order.status] || configs['Menunggu'];
  alert.style.background = cfg.bg;
  alert.style.color = cfg.color;
  alert.style.borderColor = cfg.border;
  alert.innerHTML = `<i data-lucide="${cfg.icon}" style="width:18px;height:18px;vertical-align:middle;margin-right:8px;"></i>${cfg.msg}`;
  lucide.createIcons();
}

// Menjalankan fungsi fetch status pertama kali saat halaman dimuat
dapatkanStatus();

// Mengaktifkan mekanisme polling otomatis setiap 10 detik
const interval = setInterval(dapatkanStatus, 10000);

// Menghapus interval polling ketika pelanggan menutup atau meninggalkan halaman
window.addEventListener('beforeunload', () => clearInterval(interval));
