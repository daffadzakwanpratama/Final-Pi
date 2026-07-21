/**
 * ==============================================================================
 * SKRIP MANAJEMEN KERANJANG BELANJA PELANGGAN (frontend/js/cart.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini mengolah keranjang belanja yang tersimpan di LocalStorage browser:
 * 1. Memuat item keranjang dan menghitung total bayar.
 * 2. Menambah/mengurangi kuantitas item (+/-).
 * 3. Menghapus item tertentu atau mengosongkan seluruh keranjang.
 * ==============================================================================
 */

let cart = [];

/**
 * 1. Memuat data keranjang dari LocalStorage
 */
function loadCart() {
  cart = JSON.parse(localStorage.getItem('cart')) || [];
  renderCart();
}

/**
 * 2. Merender daftar item keranjang dan ringkasan pembayaran
 */
function renderCart() {
  const container = document.getElementById('cartItemsContainer');
  const summary = document.getElementById('summarySection');
  lucide.createIcons();

  // Jika keranjang kosong
  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:var(--space-8) 0;">
        <i data-lucide="shopping-cart" style="width:48px;height:48px;color:var(--coffee-200);margin:0 auto var(--space-4) auto;display:block;"></i>
        <div style="font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-2);">Keranjang kosong</div>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:var(--space-5);">Belum ada menu yang dipilih.</p>
        <a href="menu.html" class="btn btn-primary btn-sm" style="display:inline-flex;">
          <i data-lucide="utensils" style="width:15px;height:15px;"></i> Pilih Menu
        </a>
      </div>`;
    summary.style.display = 'none';
    lucide.createIcons();
    return;
  }

  // Hitung total harga & susun HTML item
  let total = 0;
  container.innerHTML = cart.map((item, idx) => {
    const subtotal = item.harga * item.qty;
    total += subtotal;
    const img = item.gambar || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200';
    return `
      <div class="cart-item">
        <img class="cart-item-img" src="${img}" alt="${item.nama}" onerror="this.src='https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200'">
        <div class="cart-item-info">
          <div class="cart-item-nama">
            ${item.nama}
            ${item.varian ? `<span style="font-size:0.75rem;color:var(--coffee-600);background:var(--coffee-100);padding:2px 6px;border-radius:4px;font-weight:600;margin-left:4px;">${item.varian}</span>` : ''}
          </div>
          <button onclick="removeItem(${idx})" style="background:none;border:none;color:var(--status-waiting-text);font-size:0.75rem;font-weight:600;cursor:pointer;padding:4px 0;display:flex;align-items:center;gap:4px;font-family:inherit;">
            <i data-lucide="trash-2" style="width:12px;height:12px;"></i> Hapus
          </button>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:var(--space-2);">
          <div class="qty-control">
            <button class="qty-btn" onclick="updateQty(${idx}, -1)">
              <i data-lucide="minus" style="width:14px;height:14px;"></i>
            </button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" onclick="updateQty(${idx}, 1)">
              <i data-lucide="plus" style="width:14px;height:14px;"></i>
            </button>
          </div>
          <div class="cart-item-subtotal">${formatRupiah(subtotal)}</div>
        </div>
      </div>
    `;
  }).join('');

  // Perbarui total di UI
  document.getElementById('subtotalVal').textContent = formatRupiah(total);
  document.getElementById('totalVal').textContent = formatRupiah(total);
  summary.style.display = 'block';
  lucide.createIcons();
}

/**
 * 3. Mengubah kuantitas item (+1 atau -1)
 */
function updateQty(idx, change) {
  cart[idx].qty += change;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveAndRender();
}

/**
 * 4. Menghapus item tertentu dari keranjang
 */
function removeItem(idx) {
  if (confirm(`Hapus "${cart[idx].nama}" dari keranjang?`)) {
    cart.splice(idx, 1);
    saveAndRender();
  }
}

/**
 * 5. Mengosongkan keranjang
 */
function clearCart() {
  if (confirm('Kosongkan seluruh keranjang?')) {
    cart = [];
    saveAndRender();
  }
}

/**
 * 6. Menyimpan state keranjang ke LocalStorage & merender ulang UI
 */
function saveAndRender() {
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}

loadCart();
