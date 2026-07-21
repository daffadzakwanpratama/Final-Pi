/**
 * ==============================================================================
 * SKRIP PROSES CHECKOUT & PEMBAYARAN PELANGGAN (frontend/js/checkout.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini bertindak sebagai manajer transaksi checkout di sisi pelanggan:
 * 1. Memeriksa validitas meja dan item keranjang.
 * 2. Mengatur opsi metode pembayaran (Tunai vs Nontunai / Midtrans Snap).
 * 3. Mengirimkan order payload ke backend API `/api/orders`.
 * 4. Membuka Popup Midtrans Snap jika pembayaran online dipilih.
 * 5. Mengarahkan pelanggan ke halaman status pesanan (`status.html?id=xxx`).
 * ==============================================================================
 */

lucide.createIcons();

let cart = [];
let metodePembayaran = 'tunai';

/**
 * 1. Menginisialisasi Halaman Checkout
 */
function initCheckout() {
  cart = JSON.parse(localStorage.getItem('cart')) || [];
  const noMeja = localStorage.getItem('nomor_meja') || '';

  if (!noMeja) {
    alert('Nomor meja tidak terdeteksi. Silakan pilih meja terlebih dahulu.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('nomorMejaInput').value = noMeja;

  if (cart.length === 0) {
    alert('Keranjang kosong. Silakan pilih menu terlebih dahulu.');
    window.location.href = 'menu.html';
    return;
  }
  renderSummary();
}

/**
 * 2. Merender Ringkasan Item & Total Biaya Checkout
 */
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
        <span style="font-weight:600;">${formatRupiah(sub)}</span>
      </div>`;
  }).join('');

  document.getElementById('checkoutTotalVal').textContent = formatRupiah(total);
}

/**
 * 3. Mengubah Metode Pembayaran (Tunai / Nontunai)
 */
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

/**
 * 4. Memproses Pembuatan Pesanan ke Backend API
 */
async function prosesCheckout() {
  const meja = document.getElementById('nomorMejaInput').value.trim();
  const nama = document.getElementById('namaPemesanInput').value.trim();
  
  if (!nama) { alert('Silakan masukkan nama pemesan.'); return; }
  if (!meja) { alert('Nomor meja harus diisi.'); return; }

  const payload = {
    nomor_meja: meja,
    nama_pelanggan: nama,
    items: cart.map(c => ({ menu_id: c.id, qty: c.qty, varian: c.varian })),
    metode_pembayaran: metodePembayaran
  };

  const btn = document.getElementById('btnProsesPesanan');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-circle" style="width:18px;height:18px;"></i> Memproses...';
  lucide.createIcons();

  try {
    const data = await API.post('/api/orders', payload);
    localStorage.removeItem('cart');

    // Jika metode pembayaran Nontunai dan Snap Token tersedia dari Midtrans
    if (metodePembayaran === 'nontunai' && data.snap_token) {
      snap.pay(data.snap_token, {
        onSuccess: function(result) {
          API.post(`/api/orders/${data.order_id}/update-payment-client`, { status_pembayaran: 'Sudah Bayar' })
            .finally(() => { window.location.href = `status.html?id=${data.order_id}`; });
        },
        onPending: function(result) {
          API.post(`/api/orders/${data.order_id}/update-payment-client`, { status_pembayaran: 'Belum Bayar' })
            .finally(() => { window.location.href = `status.html?id=${data.order_id}`; });
        },
        onError: function(result) {
          alert('Pembayaran online gagal. Silakan bayar secara tunai ke kasir.');
          window.location.href = `status.html?id=${data.order_id}`;
        },
        onClose: function() {
          alert('Anda menutup popup pembayaran. Anda tetap dapat menyelesaikan pembayaran di halaman status pesanan.');
          window.location.href = `status.html?id=${data.order_id}`;
        }
      });
    } else {
      if (data.fallback_to_cash) { alert(data.pesan); }
      window.location.href = `status.html?id=${data.order_id}`;
    }
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" style="width:18px;height:18px;"></i> Pesan Sekarang';
    lucide.createIcons();
  }
}

document.getElementById('btnProsesPesanan').addEventListener('click', prosesCheckout);
initCheckout();
