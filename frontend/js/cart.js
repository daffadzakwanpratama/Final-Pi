let cart = [];

function loadCart() {
  cart = JSON.parse(localStorage.getItem('cart')) || [];
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItemsContainer');
  const summary = document.getElementById('summarySection');
  lucide.createIcons();

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
          <div class="cart-item-harga">Rp ${item.harga.toLocaleString('id-ID')}</div>
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
          <div class="cart-item-subtotal">Rp ${subtotal.toLocaleString('id-ID')}</div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('subtotalVal').textContent = `Rp ${total.toLocaleString('id-ID')}`;
  document.getElementById('totalVal').textContent = `Rp ${total.toLocaleString('id-ID')}`;
  summary.style.display = 'block';
  lucide.createIcons();
}

function updateQty(idx, change) {
  cart[idx].qty += change;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveAndRender();
}

function removeItem(idx) {
  if (confirm(`Hapus "${cart[idx].nama}" dari keranjang?`)) {
    cart.splice(idx, 1);
    saveAndRender();
  }
}

function clearCart() {
  if (confirm('Kosongkan seluruh keranjang?')) {
    cart = [];
    saveAndRender();
  }
}

function saveAndRender() {
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}

loadCart();
