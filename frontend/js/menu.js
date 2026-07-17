let listMenu = [];
let listCategories = [];
let kategoriAktif = 'Semua';

// Ambil nomor meja dari URL / localStorage
const urlParams = new URLSearchParams(window.location.search);
let noMeja = urlParams.get('meja');
if (noMeja) { localStorage.setItem('nomor_meja', noMeja); }
else { noMeja = localStorage.getItem('nomor_meja'); }

if (!noMeja) { window.location.href = 'index.html'; }

document.getElementById('mejaText').textContent = `Meja ${noMeja}`;
lucide.createIcons();

function getCategoryIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('semua')) return 'sparkles';
  if (n.includes('minum') || n.includes('drink') || n.includes('kopi') || n.includes('coffee') || n.includes('tea') || n.includes('susu')) return 'coffee';
  if (n.includes('makan') || n.includes('food') || n.includes('rice') || n.includes('mie') || n.includes('daging')) return 'utensils';
  if (n.includes('cemil') || n.includes('snack') || n.includes('kue') || n.includes('roti') || n.includes('cookie') || n.includes('goreng')) return 'cookie';
  return 'tag';
}

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error();
    listCategories = await res.json();
    renderCategoryChips();
  } catch {
    console.error('Gagal memuat kategori.');
  }
}

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

// Ambil daftar menu dari server
async function loadMenu() {
  try {
    const res = await fetch('/api/menu');
    if (!res.ok) throw new Error('Gagal memuat menu');
    listMenu = await res.json();
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

// Helper function to get menu tags dynamically based on product item
function getMenuTag(m) {
  if (m.is_favorit) return 'Favorit';
  const name = m.nama;
  const n = name.toLowerCase();
  if (n.includes('uncle jo') || n.includes('signature')) return 'Signature';
  if (n.includes('spesial') || n.includes('bestseller') || n.includes('nasi goreng')) return 'Bestseller';
  if (n.includes('clubhouse') || n.includes('sandwich') || n.includes('chef pick')) return 'Chef Pick';
  return null;
}

// Helper function to render a menu card
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
              Rp ${priceVal.toLocaleString('id-ID')}
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

// Render kartu menu
function renderMenu() {
  const list = document.getElementById('menuList');

  if (kategoriAktif === 'Semua') {
    // Group by category
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

    // Leftover items without category
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
    // Flat list for specific category
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

    // Header for single category
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

// Filter kategori
function filterKategori(kat, el) {
  kategoriAktif = kat;
  document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderMenu();
}

// Modal
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

    // Overwrite click events untuk meneruskan menu ID
    document.getElementById('optHot').onclick = () => selectVariant('Hot', id);
    document.getElementById('optIce').onclick = () => selectVariant('Ice', id);

    selectVariant('Ice', id); // Default ke Ice
  } else {
    vSec.style.display = 'none';
    document.getElementById('modalHarga').textContent = `Rp ${m.harga.toLocaleString('id-ID')}`;
  }

  document.getElementById('btnAddToCart').onclick = () => addToCart(id, false);
  document.getElementById('detailModal').classList.add('show');
}

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

  // Update harga modal sesuai varian
  const m = listMenu.find(x => x.id === menuId);
  if (m) {
    const hargaVarian = val === 'Hot' ? m.harga_hot : m.harga_ice;
    document.getElementById('modalHarga').textContent = `Rp ${hargaVarian.toLocaleString('id-ID')}`;
  }
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('show');
}

// Keranjang
function addToCart(id, checkVarian = false) {
  const m = listMenu.find(x => x.id === id);
  if (!m) return;

  // Jika memesan langsung dari kartu menu grid luar dan memiliki varian hot/ice, buka modal dahulu
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

function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const total = cart.reduce((s, c) => s + c.qty, 0);
  const badge = document.getElementById('cartCount');
  badge.textContent = total;
  if (total > 0) { badge.classList.add('show'); } else { badge.classList.remove('show'); }
}

// Tutup modal jika klik overlay
document.getElementById('detailModal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

async function initPage() {
  await loadCategories();
  await loadMenu();
  updateCartBadge();
}
initPage();
