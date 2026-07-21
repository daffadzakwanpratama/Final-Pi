/**
 * ==============================================================================
 * HALAMAN MENU UTAMA PELANGGAN (frontend/js/menu.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * Skrip ini mengatur seluruh interaktivitas daftar menu kafe untuk pelanggan:
 * 1. Deteksi nomor meja dari parameter URL atau LocalStorage.
 * 2. Mengambil kategori & produk dari backend API menggunakan `API.get()`.
 * 3. Filter kategori dinamis & pencarian menu.
 * 4. Modal detail produk dengan opsi varian (Hot / Ice).
 * 5. Manajemen keranjang belanja lokal di LocalStorage.
 * ==============================================================================
 */

// State Aplikasi
let listMenu = [];
let listCategories = [];
let kategoriAktif = 'Semua';

// 1. Inisialisasi Nomor Meja Pelanggan
const urlParams = new URLSearchParams(window.location.search);
let noMeja = urlParams.get('meja');

if (noMeja) { 
  localStorage.setItem('nomor_meja', noMeja); 
} else { 
  noMeja = localStorage.getItem('nomor_meja'); 
}

// Redirect ke halaman awal jika pelanggan belum memilih nomor meja
if (!noMeja) { 
  window.location.href = 'index.html'; 
}

// Tampilkan nomor meja pada header UI
document.getElementById('mejaText').textContent = `Meja ${noMeja}`;
lucide.createIcons();

/**
 * Menentukan ikon Lucide yang cocok berdasarkan nama kategori
 * @param {string} name 
 */
function getCategoryIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('semua')) return 'sparkles';
  if (n.includes('minum') || n.includes('drink') || n.includes('kopi') || n.includes('coffee') || n.includes('tea') || n.includes('susu')) return 'coffee';
  if (n.includes('makan') || n.includes('food') || n.includes('rice') || n.includes('mie') || n.includes('daging')) return 'utensils';
  if (n.includes('cemil') || n.includes('snack') || n.includes('kue') || n.includes('roti') || n.includes('cookie') || n.includes('goreng')) return 'cookie';
  return 'tag';
}

/**
 * 2. Mengambil daftar kategori dari API Backend
 */
async function loadCategories() {
  try {
    listCategories = await API.get('/api/categories');
    renderCategoryChips();
  } catch (err) {
    console.error('Gagal memuat kategori:', err.message);
  }
}

/**
 * 3. Merender tombol filter kategori (Chips) secara dinamis
 */
function renderCategoryChips() {
  const container = document.getElementById('categoryScroll');
  let chipsHtml = `
    <button class="category-chip ${kategoriAktif === 'Semua' ? 'active' : ''}" onclick="filterKategori('Semua', this)">
      <i data-lucide="sparkles" style="width:13px;height:13px;"></i> Semua
    </button>
  `;

  chipsHtml += listCategories.map(cat => {
    const iconName = getCategoryIcon(cat.nama);
    const isActive = kategoriAktif === cat.nama;
    return `
      <button class="category-chip ${isActive ? 'active' : ''}" onclick="filterKategori('${cat.nama}', this)">
        <i data-lucide="${iconName}" style="width:13px;height:13px;"></i> ${cat.nama}
      </button>
    `;
  }).join('');

  container.innerHTML = chipsHtml;
  lucide.createIcons();
}

/**
 * 4. Mengambil daftar produk menu dari API Backend
 */
async function loadMenu() {
  try {
    listMenu = await API.get('/api/menu');
    renderMenu();
  } catch (err) {
    document.getElementById('menuList').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="wifi-off" style="width:40px;height:40px;"></i></div>
        <p>Gagal memuat menu. Periksa koneksi Anda.</p>
      </div>`;
    lucide.createIcons();
  }
}

/**
 * Menentukan tag promosi menu (Favorit, Signature, Bestseller, dsb)
 */
function getMenuTag(m) {
  if (m.is_favorit) return 'Favorit';
  const n = m.nama.toLowerCase();
  if (n.includes('uncle jo') || n.includes('signature')) return 'Signature';
  if (n.includes('spesial') || n.includes('bestseller') || n.includes('nasi goreng')) return 'Bestseller';
  if (n.includes('clubhouse') || n.includes('sandwich') || n.includes('chef pick')) return 'Chef Pick';
  return null;
}

/**
 * 5. Merender kartu menu individual
 */
function renderMenuCard(m) {
  const tag = getMenuTag(m);
  const tagHtml = tag ? `<span class="menu-card-tag">${tag}</span>` : '';
  const priceVal = m.is_hot_ice ? Math.min(m.harga_hot || 0, m.harga_ice || 0) : m.harga;
  
  return `
    <div class="menu-card" onclick="openModal(${m.id})">
      <div class="menu-card-img-wrapper" style="position: relative; width: 100%; height: 120px; overflow: hidden; background-color: var(--surface-beige);">
        <img class="menu-card-img" src="${m.gambar || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400'}" alt="${m.nama}" onerror="this.src='https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400'" style="width: 100%; height: 100%; object-fit: cover;">
        ${tagHtml}
      </div>
      <div class="menu-card-body">
        <div class="menu-card-nama">${m.nama}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 6px; line-height: 1.4; height: 2.8em; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
          ${m.deskripsi || 'Tidak ada deskripsi.'}
        </div>
        <div class="menu-card-footer">
          <div class="menu-card-harga" style="font-size:0.75rem;">
            <span style="font-size: 0.95rem; font-weight: 700; color: var(--coffee-900);">
              ${formatRupiah(priceVal)}
            </span>
          </div>
          <button class="menu-card-add-btn" onclick="event.stopPropagation(); addToCart(${m.id}, true)">
            <i data-lucide="plus" style="width:16px;height:16px;stroke-width:3px;"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 6. Merender daftar menu berdasarkan kelompok kategori
 */
function renderMenu() {
  const list = document.getElementById('menuList');

  if (kategoriAktif === 'Semua') {
    const activeCats = listCategories.filter(cat => listMenu.some(m => m.kategori === cat.nama));

    if (listMenu.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="package-open" style="width:40px;height:40px;"></i></div>
          <p>Belum ada menu yang tersedia.</p>
        </div>`;
      lucide.createIcons();
      return;
    }

    let html = '';
    let isFirst = true;
    activeCats.forEach(cat => {
      const items = listMenu.filter(m => m.kategori === cat.nama);
      if (items.length > 0) {
        const marginTop = isFirst ? 'margin-top: var(--space-2);' : 'margin-top: var(--space-6);';
        isFirst = false;

        html += `
          <div class="category-divider" style="grid-column: 1 / -1; ${marginTop} margin-bottom: var(--space-4);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <i data-lucide="${getCategoryIcon(cat.nama)}" style="width: 18px; height: 18px; color: var(--coffee-700);"></i>
              <h3 style="font-family: 'Times New Roman', Times, Baskerville, Georgia, serif; font-size: 1.35rem; font-weight: 700; color: var(--text-primary); text-transform: capitalize; margin: 0;">${cat.nama}</h3>
              <div style="flex: 1; height: 1px; background: var(--border);"></div>
            </div>
          </div>
        `;
        html += items.map(m => renderMenuCard(m)).join('');
      }
    });

    const leftoverItems = listMenu.filter(m => !listCategories.some(cat => cat.nama === m.kategori));
    if (leftoverItems.length > 0) {
      const marginTop = isFirst ? 'margin-top: var(--space-2);' : 'margin-top: var(--space-6);';
      
      html += `
        <div class="category-divider" style="grid-column: 1 / -1; ${marginTop} margin-bottom: var(--space-4);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <i data-lucide="tag" style="width: 18px; height: 18px; color: var(--coffee-700);"></i>
            <h3 style="font-family: 'Times New Roman', Times, Baskerville, Georgia, serif; font-size: 1.35rem; font-weight: 700; color: var(--text-primary); text-transform: capitalize; margin: 0;">Lainnya</h3>
            <div style="flex: 1; height: 1px; background: var(--border);"></div>
          </div>
        </div>
      `;
      html += leftoverItems.map(m => renderMenuCard(m)).join('');
    }

    list.innerHTML = html;
  } else {
    const filtered = listMenu.filter(m => m.kategori === kategoriAktif);

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="package-open" style="width:40px;height:40px;"></i></div>
          <p>Belum ada menu untuk kategori ini.</p>
        </div>`;
      lucide.createIcons();
      return;
    }

    let html = `
      <div class="category-divider" style="grid-column: 1 / -1; margin-top: var(--space-2); margin-bottom: var(--space-4);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <i data-lucide="${getCategoryIcon(kategoriAktif)}" style="width: 18px; height: 18px; color: var(--coffee-700);"></i>
          <h3 style="font-family: 'Times New Roman', Times, Baskerville, Georgia, serif; font-size: 1.35rem; font-weight: 700; color: var(--text-primary); text-transform: capitalize; margin: 0;">${kategoriAktif}</h3>
          <div style="flex: 1; height: 1px; background: var(--border);"></div>
        </div>
      </div>
    `;
    html += filtered.map(m => renderMenuCard(m)).join('');
    list.innerHTML = html;
  }
  lucide.createIcons();
}

/**
 * 7. Mengubah filter kategori aktif
 */
function filterKategori(kat, el) {
  kategoriAktif = kat;
  document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderMenu();
}

/**
 * 8. Membuka modal detail menu
 */
function openModal(id) {
  const m = listMenu.find(x => x.id === id);
  if (!m) return;

  document.getElementById('modalImg').src = m.gambar || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400';
  document.getElementById('modalNama').textContent = m.nama;
  document.getElementById('modalKategori').textContent = m.kategori;
  document.getElementById('modalDeskripsi').textContent = m.deskripsi || 'Tidak ada deskripsi untuk menu ini.';

  const vSec = document.getElementById('variantSection');
  if (m.is_hot_ice) {
    vSec.style.display = 'block';

    document.getElementById('optHot').onclick = () => selectVariant('Hot', id);
    document.getElementById('optIce').onclick = () => selectVariant('Ice', id);

    selectVariant('Ice', id);
  } else {
    vSec.style.display = 'none';
    document.getElementById('modalHarga').textContent = formatRupiah(m.harga);
  }

  document.getElementById('btnAddToCart').onclick = () => addToCart(id, false);
  document.getElementById('detailModal').classList.add('show');
}

/**
 * 9. Mengatur varian Hot/Ice pada modal
 */
function selectVariant(val, menuId) {
  document.querySelectorAll('.variant-opt').forEach(el => {
    el.style.borderColor = 'var(--border)';
    el.style.background = 'var(--surface-white)';
    el.style.color = 'var(--text-secondary)';
  });
  const selected = document.getElementById(val === 'Hot' ? 'optHot' : 'optIce');
  selected.style.borderColor = 'var(--primary)';
  selected.style.background = 'var(--primary-light)';
  selected.style.color = 'var(--primary)';
  selected.querySelector('input').checked = true;

  const m = listMenu.find(x => x.id === menuId);
  if (m) {
    const hargaVarian = val === 'Hot' ? m.harga_hot : m.harga_ice;
    document.getElementById('modalHarga').textContent = formatRupiah(hargaVarian);
  }
}

/**
 * 10. Menutup modal
 */
function closeModal() {
  document.getElementById('detailModal').classList.remove('show');
}

/**
 * 11. Menambahkan barang ke keranjang di LocalStorage
 */
function addToCart(id, checkVarian = false) {
  const m = listMenu.find(x => x.id === id);
  if (!m) return;

  if (checkVarian && m.is_hot_ice) {
    openModal(id);
    return;
  }

  let selectedVarian = null;
  let finalHarga = m.harga;

  if (m.is_hot_ice) {
    const checked = document.querySelector('input[name="variantOpt"]:checked');
    if (checked) {
      selectedVarian = checked.value;
      finalHarga = selectedVarian === 'Hot' ? m.harga_hot : m.harga_ice;
    }
  }

  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const idx = cart.findIndex(c => c.id === id && c.varian === selectedVarian);
  
  if (idx > -1) {
    cart[idx].qty++;
  } else {
    cart.push({
      id: m.id,
      nama: m.nama,
      harga: finalHarga,
      gambar: m.gambar,
      qty: 1,
      varian: selectedVarian
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
  closeModal();

  const vSuffix = selectedVarian ? ` (${selectedVarian})` : '';
  alert(`✓ "${m.nama}${vSuffix}" telah dimasukkan ke keranjang!`);
}

/**
 * 12. Mengupdate badge jumlah item di keranjang
 */
function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const total = cart.reduce((s, c) => s + c.qty, 0);
  const badge = document.getElementById('cartCount');
  badge.textContent = total;
  
  if (total > 0) { 
    badge.classList.add('show'); 
  } else { 
    badge.classList.remove('show'); 
  }
}

document.getElementById('detailModal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

/**
 * 13. Fungsi Inisialisasi Halaman
 */
async function initPage() {
  await loadCategories();
  await loadMenu();
  updateCartBadge();
}

initPage();
