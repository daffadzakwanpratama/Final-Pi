lucide.createIcons();
const token = localStorage.getItem('admin_token');
if (!token) window.location.href = 'login.html';

const username = localStorage.getItem('admin_username') || 'Admin';
document.getElementById('greetingText').textContent = `Selamat datang, ${username}`;
document.getElementById('dateText').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

async function loadDashboard() {
  try {
    const res = await fetch('/api/orders/dashboard-summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { logout(); return; }
    const data = await res.json();
    
    // Update stats
    document.getElementById('statMenu').textContent     = data.jumlah_menu ?? '—';
    document.getElementById('statHariIni').textContent  = data.pesanan_hari_ini ?? '—';
    document.getElementById('statMenunggu').textContent = data.pesanan_menunggu ?? '—';
    document.getElementById('statDiproses').textContent = data.pesanan_diproses ?? '—';

    // Render recent orders
    const container = document.getElementById('recentOrdersContainer');
    const orders = data.pesanan_terbaru || [];

    if (!orders.length) {
      container.innerHTML = `<div style="text-align:center;padding:var(--space-8);color:var(--text-muted);"><i data-lucide="inbox" style="width:32px;height:32px;margin:0 auto var(--space-3) auto;display:block;"></i>Belum ada pesanan.</div>`;
      lucide.createIcons();
      return;
    }

    container.innerHTML = orders.map(o => `
      <div class="recent-order-row">
        <div>
          <div style="font-weight:600;font-size:0.9rem;color:var(--text-primary);">${o.nama_pelanggan || 'Pelanggan'}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);">
            ${new Date(o.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            &bull; Meja ${o.nomor_meja}
          </div>
        </div>
        <span class="badge badge-${o.status.toLowerCase()}">${o.status}</span>
      </div>
    `).join('');
    lucide.createIcons();
  } catch (err) {
    console.error("Gagal memuat dashboard:", err);
  }
}

function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_username');
  window.location.href = 'login.html';
}

async function clearTodayOrders() {
  if (!confirm('Apakah Anda yakin ingin menghapus SEMUA data pesanan? Tindakan ini tidak dapat dibatalkan.')) {
    return;
  }
  try {
    const res = await fetch('/api/orders/today', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    alert(data.pesan);
    loadDashboard();
  } catch (err) {
    alert('Gagal menghapus pesanan hari ini.');
  }
}

loadDashboard();
