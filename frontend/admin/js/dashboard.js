/**
 * ==============================================================================
 * SKRIP DASHBOARD ADMINISTRATOR (frontend/admin/js/dashboard.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini mengelola tampilan utama (Dashboard) panel admin:
 * 1. Proteksi sesi Admin (redirect ke `login.html` jika belum login).
 * 2. Memuat ringkasan statistik (jumlah menu, pesanan hari ini, pesanan menunggu).
 * 3. Menampilkan daftar pesanan terbaru secara real-time.
 * 4. Menyediakan fitur Logout aman.
 * ==============================================================================
 */

lucide.createIcons();

// 1. Proteksi Sesi Admin
const token = API.getToken();
if (!token) {
  window.location.href = '/admin/login.html';
}

// Menampilkan ucapan selamat datang dan tanggal hari ini
const username = localStorage.getItem('admin_username') || 'Admin';
document.getElementById('greetingText').textContent = `Selamat datang, ${username}`;
document.getElementById('dateText').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * 2. Memuat data ringkasan dashboard dari backend API
 */
async function loadDashboard() {
  try {
    const data = await API.get('/api/orders/dashboard-summary');
    
    // Perbarui counter statistik UI
    document.getElementById('statMenu').textContent     = data.jumlah_menu ?? '—';
    document.getElementById('statHariIni').textContent  = data.pesanan_hari_ini ?? '—';
    document.getElementById('statMenunggu').textContent = data.pesanan_menunggu ?? '—';
    document.getElementById('statDiproses').textContent = data.pesanan_diproses ?? '—';

    // Merender pesanan terbaru
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
    if (err.message.includes('401') || err.message.includes('403')) {
      logout();
    }
  }
}

/**
 * 3. Fungsi Logout Administrator
 */
function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_username');
  window.location.href = '/admin/login.html';
}

loadDashboard();
