/**
 * ==============================================================================
 * SKRIP PEMANTAUAN STATUS PESANAN PELANGGAN (frontend/js/status.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * Skrip ini menyediakan pemantauan status pesanan real-time bagi pelanggan:
 * 1. Mengambil ID pesanan dari query parameter URL (`?id=XXX`).
 * 2. Melakukan Polling HTTP otomatis setiap 10 detik ke `/api/orders/:id/status`.
 * 3. Memperbarui progress tracker status (Menunggu -> Diproses -> Siap -> Selesai).
 * 4. Menyediakan tombol Bayar Ulang (Midtrans Snap) jika pembayaran online belum lunas.
 * ==============================================================================
 */

// 1. Inisialisasi Parameter Halaman
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('id');

if (!orderId) { 
  window.location.href = 'menu.html'; 
}

document.getElementById('orderIdText').textContent = `#${orderId}`;
lucide.createIcons();

/**
 * 2. Mengambil data status pesanan terbaru dari API backend
 */
async function dapatkanStatus() {
  try {
    const data = await API.get(`/api/orders/${orderId}/status`);
    perbaruiUI(data);
  } catch (err) {
    document.getElementById('statusAlertBox').innerHTML =
      `<span style="color:var(--status-waiting-text)">Koneksi terputus. Mencoba menghubungkan kembali...</span>`;
  }
}

/**
 * 3. Memperbarui UI berdasarkan data pesanan & pembayaran terbaru
 */
function perbaruiUI(data) {
  const order = data.order;
  const items = data.items;

  // Format waktu lokal (WIB)
  const waktu = new Date(order.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('waktuText').textContent = `${order.nama_pelanggan || 'Pelanggan'} • Meja ${order.nomor_meja} • Pukul ${waktu} WIB`;
  document.getElementById('mejaBadge').textContent = `Meja ${order.nomor_meja}`;

  // Memperbarui Kartu Pembayaran
  if (order.metode_pembayaran) {
    document.getElementById('pembayaranCard').style.display = 'block';
    document.getElementById('metodePembayaranVal').textContent = order.metode_pembayaran === 'nontunai' ? 'Non-Tunai (Online)' : 'Tunai di Kasir';

    const pBadge = document.getElementById('statusPembayaranBadge');
    pBadge.textContent = order.status_pembayaran;
    
    // Reset style badge
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
            onSuccess: function() {
              API.post(`/api/orders/${order.id}/update-payment-client`, { status_pembayaran: 'Sudah Bayar' })
                .finally(() => dapatkanStatus());
            },
            onPending: function() {
              API.post(`/api/orders/${order.id}/update-payment-client`, { status_pembayaran: 'Belum Bayar' })
                .finally(() => dapatkanStatus());
            },
            onError: function() { dapatkanStatus(); },
            onClose: function() { dapatkanStatus(); }
          });
        };
      } else {
        document.getElementById('btnBayarUlangContainer').style.display = 'none';
      }
    } else {
      pBadge.style.background = '#fde8e8';
      pBadge.style.color = '#9b1c1c';
      pBadge.style.borderColor = '#f8b4b4';
      document.getElementById('btnBayarUlangContainer').style.display = 'none';
    }
  } else {
    document.getElementById('pembayaranCard').style.display = 'none';
  }

  // Memperbarui Rincian Items
  let total = 0;
  document.getElementById('orderItemsList').innerHTML = items.map(item => {
    total += item.subtotal;
    const vText = item.varian ? ` (${item.varian})` : '';
    return `<div class="order-item-row">
      <span>${item.nama || 'Menu'}${vText} <strong style="color:var(--coffee-600)">×${item.qty}</strong></span>
      <span style="font-weight:600;">${formatRupiah(item.subtotal)}</span>
    </div>`;
  }).join('');
  document.getElementById('totalHargaText').textContent = formatRupiah(total);

  // Memperbarui Progress Tracker
  const urutanStatus = ['Menunggu', 'Diproses', 'Siap', 'Selesai'];
  const idxAktif = urutanStatus.indexOf(order.status);

  urutanStatus.forEach((s, idx) => {
    const el = document.getElementById(`step-${s}`);
    el.classList.remove('active', 'done');
    if (idx < idxAktif) el.classList.add('done');
    if (idx === idxAktif) el.classList.add('active');
  });

  // Memperbarui Kotak Alert Notifikasi
  const alertBox = document.getElementById('statusAlertBox');
  const configs = {
    'Menunggu': { bg: 'var(--status-waiting-bg)', color: 'var(--status-waiting-text)', border: 'var(--status-waiting-border)', icon: 'clock', msg: 'Pesanan Anda diterima. Sedang menunggu konfirmasi.' },
    'Diproses': { bg: 'var(--status-process-bg)', color: 'var(--status-process-text)', border: 'var(--status-process-border)', icon: 'coffee', msg: 'Pesanan Anda sedang diracik oleh barista.' },
    'Siap': { bg: 'var(--status-ready-bg)', color: 'var(--status-ready-text)', border: 'var(--status-ready-border)', icon: 'bell', msg: 'Pesanan SIAP! Silakan ambil di kasir.' },
    'Selesai': { bg: 'var(--status-done-bg)', color: 'var(--status-done-text)', border: 'var(--status-done-border)', icon: 'circle-check', msg: 'Selesai! Terima kasih sudah berkunjung.' },
  };
  const cfg = configs[order.status] || configs['Menunggu'];
  alertBox.style.background = cfg.bg;
  alertBox.style.color = cfg.color;
  alertBox.style.borderColor = cfg.border;
  alertBox.innerHTML = `<i data-lucide="${cfg.icon}" style="width:18px;height:18px;vertical-align:middle;margin-right:8px;"></i>${cfg.msg}`;
  lucide.createIcons();
}

// Jalankan pemanggilan pertama
dapatkanStatus();

// Polling otomatis setiap 10 detik
const interval = setInterval(dapatkanStatus, 10000);
window.addEventListener('beforeunload', () => clearInterval(interval));
