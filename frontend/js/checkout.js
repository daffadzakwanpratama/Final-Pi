// =================================================================
// Skrip Proses Checkout & Pembayaran Pelanggan (checkout.js)
// Deskripsi: Mengelola ringkasan pesanan, pemilihan metode pembayaran 
//            (Tunai/Nontunai), integrasi payment gateway Midtrans Snap,
//            dan pengiriman data pesanan ke backend.
// =================================================================

// Inisialisasi ikon Lucide di halaman
lucide.createIcons();

// Inisialisasi variabel global untuk keranjang dan metode pembayaran default
let cart = [];
let metodePembayaran = 'tunai';

// 1. Fungsi initCheckout
// Deskripsi: Memvalidasi ketersediaan meja dan keranjang belanja saat halaman checkout dimuat
function initCheckout() {
  cart = JSON.parse(localStorage.getItem('cart')) || [];
  const noMeja = localStorage.getItem('nomor_meja') || '';

  // Validasi nomor meja
  if (!noMeja) {
    alert('Nomor meja tidak terdeteksi. Silakan pilih meja terlebih dahulu.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('nomorMejaInput').value = noMeja;

  // Validasi isi keranjang
  if (cart.length === 0) {
    alert('Keranjang kosong. Silakan pilih menu terlebih dahulu.');
    window.location.href = 'menu.html';
    return;
  }
  renderSummary();
}

// 2. Fungsi renderSummary
// Deskripsi: Menampilkan daftar ringkasan menu yang dibeli beserta subtotal dan total harga
function renderSummary() {
  const list = document.getElementById('checkoutItemsList');
  let total = 0;

  list.innerHTML = cart.map(item => {
    const sub = item.harga * item.qty;
    total += sub;
    const vText = item.varian ? ` (${item.varian})` : '';
    return `
      <div style="display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:var(--space-3);color:var(--text-secondary);">
        <span>${item.nama}${vText} <strong style="color:var(--coffee-600)">×${item.qty}</strong></span>
        <span style="font-weight:600;">Rp ${sub.toLocaleString('id-ID')}</span>
      </div>`;
  }).join('');

  document.getElementById('checkoutTotalVal').textContent = `Rp ${total.toLocaleString('id-ID')}`;
}

// 3. Fungsi selectPaymentMethod
// Deskripsi: Mengubah metode pembayaran terpilih (Tunai vs Nontunai) di UI
function selectPaymentMethod(method) {
  metodePembayaran = method;
  const payTunai = document.getElementById('payTunai');
  const payNontunai = document.getElementById('payNontunai');
  const infoTunai = document.getElementById('infoTunai');
  const infoNontunai = document.getElementById('infoNontunai');

  if (method === 'tunai') {
    payTunai.classList.add('active');
    payNontunai.classList.remove('active');
    infoTunai.style.display = 'flex';
    infoNontunai.style.display = 'none';
  } else {
    payNontunai.classList.add('active');
    payTunai.classList.remove('active');
    infoTunai.style.display = 'none';
    infoNontunai.style.display = 'flex';
  }
}

// 4. Fungsi prosesCheckout
// Deskripsi: Mengirimkan pesanan ke backend API, dan memicu pop-up Midtrans jika nontunai
async function prosesCheckout() {
  const meja = document.getElementById('nomorMejaInput').value.trim();
  const nama = document.getElementById('namaPemesanInput').value.trim();
  
  // Validasi input nama dan nomor meja
  if (!nama) { alert('Silakan masukkan nama pemesan.'); return; }
  if (!meja) { alert('Nomor meja harus diisi.'); return; }

  // Menyusun data payload pesanan
  const payload = {
    nomor_meja: meja,
    nama_pelanggan: nama,
    items: cart.map(c => ({ menu_id: c.id, qty: c.qty, varian: c.varian })),
    metode_pembayaran: metodePembayaran
  };

  // Menonaktifkan tombol untuk mencegah klik ganda (double-submit)
  const btn = document.getElementById('btnProsesPesanan');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-circle" style="width:18px;height:18px;"></i> Memproses...';
  lucide.createIcons();

  try {
    // Mengirim pesanan ke API backend
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.pesan || 'Gagal mengirim pesanan.');

    // Hapus data keranjang lokal setelah pesanan sukses dibuat
    localStorage.removeItem('cart');

    // Jika metode pembayaran Nontunai dan Snap Token tersedia dari Midtrans
    if (metodePembayaran === 'nontunai' && data.snap_token) {
      snap.pay(data.snap_token, {
        onSuccess: function(result) {
          // Pembayaran berhasil
          fetch(`/api/orders/${data.order_id}/update-payment-client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_pembayaran: 'Sudah Bayar' })
          }).then(() => {
            window.location.href = `status.html?id=${data.order_id}`;
          }).catch(() => {
            window.location.href = `status.html?id=${data.order_id}`;
          });
        },
        onPending: function(result) {
          // Pembayaran tertunda (pending)
          fetch(`/api/orders/${data.order_id}/update-payment-client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_pembayaran: 'Belum Bayar' })
          }).then(() => {
            window.location.href = `status.html?id=${data.order_id}`;
          }).catch(() => {
            window.location.href = `status.html?id=${data.order_id}`;
          });
        },
        onError: function(result) {
          // Pembayaran error
          alert('Pembayaran online gagal. Silakan bayar secara tunai ke kasir.');
          window.location.href = `status.html?id=${data.order_id}`;
        },
        onClose: function() {
          // Popup ditutup oleh pengguna
          alert('Anda menutup popup pembayaran. Anda tetap dapat menyelesaikan pembayaran di halaman status pesanan.');
          window.location.href = `status.html?id=${data.order_id}`;
        }
      });
    } else {
      // Jika tunai atau fallback ke cash
      if (data.fallback_to_cash) { alert(data.pesan); }
      window.location.href = `status.html?id=${data.order_id}`;
    }
  } catch (err) {
    // Tangani error jika koneksi/proses gagal
    alert(err.message);
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" style="width:18px;height:18px;"></i> Pesan Sekarang';
    lucide.createIcons();
  }
}

// Menambahkan event listener pada tombol proses pesanan
document.getElementById('btnProsesPesanan').addEventListener('click', prosesCheckout);

// Memulai inisialisasi halaman checkout
initCheckout();
