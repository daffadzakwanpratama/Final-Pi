/**
 * ==============================================================================
 * SKRIP ANTREAN PESANAN ADMINISTRATOR (frontend/admin/js/orders.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini mengelola antrean pesanan di panel Kasir/Admin:
 * 1. Proteksi sesi Admin via JWT Token.
 * 2. Mengurutkan pesanan (FIFO untuk antrean aktif Menunggu->Diproses->Siap).
 * 3. Memperbarui status pesanan secara linier (`API.patch('/api/orders/:id/status')`).
 * 4. Menandai pesanan lunas tunai (`API.post('/api/orders/:id/mark-paid')`).
 * 5. Auto-refresh antrean pesanan setiap 30 detik.
 * ==============================================================================
 */

lucide.createIcons();

// 1. Validasi Sesi Admin
const token = API.getToken();
if (!token) { 
  alert('Akses ditolak.'); 
  window.location.href = '/admin/login.html'; 
}

let allOrders = [];
let filterAktif = 'Semua';

// Konfigurasi Visual Status Pesanan
const statusConfig = {
  'Menunggu': {
    badgeClass:  'badge-menunggu',
    nextStatus:  'Diproses',
    nextLabel:   'Mulai Proses',
    nextIcon:    'play-circle',
    btnClass:    'btn-primary',
    cardBorder:  'var(--status-waiting-border)',
  },
  'Diproses': {
    badgeClass:  'badge-diproses',
    nextStatus:  'Siap',
    nextLabel:   'Tandai Siap',
    nextIcon:    'bell',
    btnClass:    'btn-secondary',
    cardBorder:  'var(--status-process-border)',
  },
  'Siap': {
    badgeClass:  'badge-siap',
    nextStatus:  'Selesai',
    nextLabel:   'Selesaikan',
    nextIcon:    'check',
    btnClass:    'btn-success',
    cardBorder:  'var(--status-ready-border)',
  },
  'Selesai': {
    badgeClass:  'badge-selesai',
    nextStatus:  null,
    nextLabel:   null,
    nextIcon:    null,
    btnClass:    null,
    cardBorder:  'var(--border)',
  },
};

/**
 * Mengubah filter status antrean di UI
 */
function setFilter(status, el) {
  filterAktif = status;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderOrders();
}

/**
 * 2. Mengambil seluruh pesanan dari API backend
 */
async function loadOrders() {
  try {
    allOrders = await API.get('/api/orders');
    updateBadges();
    renderOrders();
  } catch (err) {
    if (err.message.includes('401') || err.message.includes('403')) {
      logout();
      return;
    }
    document.getElementById('ordersContainer').innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:var(--space-12);color:var(--text-muted);">
        <i data-lucide="wifi-off" style="width:32px;height:32px;margin:0 auto var(--space-3) auto;display:block;"></i>
        Gagal memuat data. Coba refresh.
      </div>`;
    lucide.createIcons();
  }
}

/**
 * 3. Memperbarui badge penunjuk jumlah pesanan aktif pada tab filter
 */
function updateBadges() {
  ['Menunggu','Diproses','Siap'].forEach(s => {
    const count = allOrders.filter(o => o.status === s).length;
    const el = document.getElementById(`badge-${s}`);
    if (el) el.textContent = count > 0 ? count : '';
  });
}

/**
 * 4. Merender kartu antrean pesanan
 */
function renderOrders() {
  const container = document.getElementById('ordersContainer');
  let filtered  = filterAktif === 'Semua' ? allOrders : allOrders.filter(o => o.status === filterAktif);

  // Mengurutkan: Antrean aktif FIFO, Pesanan selesai di paling bawah LIFO
  const urutan = ['Menunggu', 'Diproses', 'Siap', 'Selesai'];
  filtered = [...filtered].sort((a, b) => {
    const rankA = urutan.indexOf(a.status);
    const rankB = urutan.indexOf(b.status);
    if (rankA !== rankB) return rankA - rankB;
    if (a.status === 'Selesai') return new Date(b.tanggal) - new Date(a.tanggal);
    return new Date(a.tanggal) - new Date(b.tanggal);
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:var(--space-12);color:var(--text-muted);">
        <i data-lucide="inbox" style="width:40px;height:40px;margin:0 auto var(--space-4) auto;display:block;"></i>
        <div style="font-weight:600;margin-bottom:4px;">Tidak ada pesanan</div>
        <div style="font-size:0.82rem;">Belum ada pesanan dengan status "${filterAktif}".</div>
      </div>`;
    lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(order => {
    const cfg   = statusConfig[order.status] || statusConfig['Selesai'];
    const waktu = new Date(order.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const tgl   = new Date(order.tanggal).toLocaleDateString('id-ID', { day:'numeric', month:'short' });

    // Merender detail item
    const itemsHtml = (order.items || []).map(item => {
      const vText = item.varian ? ` (${item.varian})` : '';
      return `<div class="order-item-row">
        <span>${item.nama}${vText} <strong style="color:var(--coffee-600)">×${item.qty}</strong></span>
        <span style="font-weight:600;">${formatRupiah(item.subtotal)}</span>
      </div>`;
    }).join('');

    const totalHarga = (order.items || []).reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

    const actionBtn = cfg.nextStatus ? `
      <button onclick="updateStatus(${order.id}, '${cfg.nextStatus}')" class="btn ${cfg.btnClass} btn-sm" style="width:auto;">
        <i data-lucide="${cfg.nextIcon}" style="width:14px;height:14px;"></i>
        ${cfg.nextLabel}
      </button>` : '';

    const paymentMethodText = order.metode_pembayaran === 'nontunai' ? '💳 Non-Tunai' : '💵 Tunai';
    const paymentStatusText = order.status_pembayaran || 'Belum Bayar';
    
    let paymentBadgeClass = 'badge-menunggu';
    if (order.status_pembayaran === 'Sudah Bayar') {
      paymentBadgeClass = 'badge-selesai';
    } else if (order.status_pembayaran === 'Gagal') {
      paymentBadgeClass = 'badge-diproses'; 
    }

    const markPaidBtn = (order.metode_pembayaran === 'tunai' && order.status_pembayaran === 'Belum Bayar') ? `
      <button onclick="markOrderPaid(${order.id})" class="btn btn-secondary btn-sm" style="width:auto;font-size:0.75rem;padding:4px 10px;margin-right:8px;background:#fdf2e9;color:#b06222;border-color:#f5c299;display:inline-flex;align-items:center;gap:4px;">
        <i data-lucide="check" style="width:12px;height:12px;"></i> Lunas
      </button>` : '';

    return `
      <div class="order-card" style="border-color:${cfg.cardBorder};">
        <div class="order-card-header">
          <div>
            <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
              <div class="order-queue-num">#${String(order.id).padStart(3,'0')}</div>
              <span class="badge ${cfg.badgeClass}">${order.status}</span>
            </div>
            <div class="order-card-meta" style="margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;line-height:1.4;">
              <span><strong>${order.nama_pelanggan || 'Pelanggan'}</strong> &bull; Meja ${order.nomor_meja} &bull; ${tgl}, ${waktu}</span>
              <span style="font-weight:600;color:var(--text-muted);font-size:0.75rem;">${paymentMethodText}</span>
              <span class="badge ${paymentBadgeClass}" style="font-size:0.68rem;padding:2px 8px;text-transform:none;">${paymentStatusText}</span>
            </div>
          </div>
          ${actionBtn}
        </div>
        <div class="order-card-body">${itemsHtml || '<p style="color:var(--text-muted);font-size:0.85rem;">Detail item tidak tersedia.</p>'}</div>
        <div class="order-card-footer">
          <div>
            <div class="order-total-label">Total Tagihan</div>
            <div class="order-total-value">${formatRupiah(totalHarga)}</div>
          </div>
          <div style="display:flex;align-items:center;">
            ${markPaidBtn}
            ${(order.status !== 'Siap' && order.status !== 'Selesai') ? `
            <button onclick="updateStatus(${order.id}, 'Selesai')" class="btn btn-ghost btn-sm" style="width:auto;font-size:0.75rem;color:var(--text-muted);">
              <i data-lucide="skip-forward" style="width:12px;height:12px;"></i> Selesaikan
            </button>` : ''}
            ${order.status === 'Selesai' ? '<span style="font-size:0.78rem;color:var(--status-ready-text);">✓ Transaksi selesai</span>' : ''}
          </div>
        </div>
      </div>`;
  }).join('');
  lucide.createIcons();
}

/**
 * 5. Mengubah status antrean pesanan
 */
async function updateStatus(orderId, newStatus) {
  try {
    await API.patch(`/api/orders/${orderId}/status`, { status: newStatus });
    loadOrders();
  } catch (err) {
    alert('Gagal mengubah status pesanan: ' + err.message);
  }
}

/**
 * 6. Menandai pesanan lunas secara manual oleh kasir
 */
async function markOrderPaid(orderId) {
  if (!confirm('Tandai pesanan ini sebagai Lunas / Sudah Bayar?')) return;
  try {
    await API.post(`/api/orders/${orderId}/mark-paid`);
    loadOrders();
  } catch (err) {
    alert('Gagal menandai lunas: ' + err.message);
  }
}

/**
 * 7. Logout Admin
 */
function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_username');
  window.location.href = '/admin/login.html';
}

/**
 * 8. Menghapus seluruh data pesanan dengan konfirmasi ganda
 */
async function clearTodayOrders() {
  if (!confirm('Apakah Anda yakin ingin menghapus SEMUA data pesanan? Tindakan ini tidak dapat dibatalkan.')) return;
  try {
    const res = await API.delete('/api/orders/today');
    alert(res.pesan || 'Seluruh pesanan berhasil dibersihkan.');
    loadOrders();
  } catch (err) {
    alert('Gagal menghapus pesanan hari ini: ' + err.message);
  }
}

loadOrders();
setInterval(loadOrders, 30000);
