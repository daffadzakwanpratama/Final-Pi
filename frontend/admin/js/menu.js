lucide.createIcons();
const token = localStorage.getItem('admin_token');
if (!token) { alert('Akses ditolak.'); window.location.href = '/admin/login.html'; }

let allCategories = [];
let allMenus = []; // defined implicitly in original loadMenus as global
let modalMode = 'add';
let base64Gambar = '';

// Mengubah file yang dipilih menjadi string Base64 Data URL
function handleFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  // Batasi ukuran file (maks 1 MB untuk keamanan performa database)
  if (file.size > 1024 * 1024) {
    alert('Ukuran foto terlalu besar. Maksimal ukuran file adalah 1 MB.');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    base64Gambar = e.target.result;
    document.getElementById('imgPreview').src = base64Gambar;
  };
  reader.readAsDataURL(file);
}

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error();
    allCategories = await res.json();
    
    const select = document.getElementById('kategoriMenu');
    select.innerHTML = allCategories.map(c => `<option value="${c.nama}">${c.nama}</option>`).join('');
  } catch {
    alert('Gagal mengambil daftar kategori.');
  }
}

async function loadMenus() {
  try {
    const res = await fetch('/api/menu');
    if (!res.ok) throw new Error();
    allMenus = await res.json();
    renderMenuTable();
  } catch {
    alert('Gagal mengambil daftar menu.');
  }
}

function toggleHargaVarian() {
  const isChecked = document.getElementById('isHotIceMenu').checked;
  const container = document.getElementById('hargaVarianContainer');
  const normalGroup = document.getElementById('hargaNormalGroup');
  
  if (isChecked) {
    container.style.display = 'flex';
    normalGroup.style.display = 'none';
    document.getElementById('hargaMenu').required = false;
    document.getElementById('hargaHotMenu').required = true;
    document.getElementById('hargaIceMenu').required = true;
  } else {
    container.style.display = 'none';
    normalGroup.style.display = 'block';
    document.getElementById('hargaMenu').required = true;
    document.getElementById('hargaHotMenu').required = false;
    document.getElementById('hargaIceMenu').required = false;
  }
}

function renderMenuTable() {
  const tbody = document.getElementById('menuTableBody');
  if (!allMenus.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:var(--space-8);color:var(--text-muted);">
      <i data-lucide="package-open" style="width:32px;height:32px;margin:0 auto var(--space-3) auto;display:block;"></i>
      Belum ada menu terdaftar. Tambahkan menu baru.
    </td></tr>`;
    lucide.createIcons();
    return;
  }

  tbody.innerHTML = allMenus.map(menu => {
    const img = menu.gambar || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200';
    let hargaText = `Rp ${menu.harga.toLocaleString('id-ID')}`;
    if (menu.is_hot_ice) {
      const hHot = menu.harga_hot ? menu.harga_hot.toLocaleString('id-ID') : '-';
      const hIce = menu.harga_ice ? menu.harga_ice.toLocaleString('id-ID') : '-';
      hargaText = `<div style="font-size:0.78rem;line-height:1.2;">
        <div>Hot: Rp ${hHot}</div>
        <div>Ice: Rp ${hIce}</div>
      </div>`;
    }
    return `
      <tr>
        <td style="color:var(--text-muted);font-size:0.82rem;">#${menu.id}</td>
        <td>
          <img class="menu-thumb" src="${img}" alt="${menu.nama}" onerror="this.src='https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200'">
        </td>
        <td>
          <div style="font-weight:600;color:var(--text-primary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${menu.nama}
            ${menu.is_favorit ? `<span class="badge" style="background: #fdf2e9; color: #b06222; border-color: #f5c299; font-size: 0.65rem; padding: 2px 6px; display: inline-flex; align-items: center; gap: 2px; text-transform: none;"><i data-lucide="star" style="width:10px;height:10px;fill:#b06222;stroke:none;"></i> Favorit</span>` : ''}
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;max-width:240px;white-space:normal;line-height:1.3;">${menu.deskripsi || '-'}</div>
        </td>
        <td><span class="badge" style="background:var(--surface-beige);color:var(--coffee-600);border-color:var(--border);">${menu.kategori}</span></td>
        <td>
          <span class="badge ${menu.is_hot_ice ? 'badge-menunggu' : 'badge-selesai'}">
            ${menu.is_hot_ice ? 'Hot / Ice' : 'Normal'}
          </span>
        </td>
        <td style="font-weight:600;">${hargaText}</td>
        <td>
          <div style="display:flex;gap:var(--space-2);">
            <button onclick="editMenuPrep(${menu.id})" class="btn btn-secondary btn-sm" style="width:auto;">
              <i data-lucide="pencil" style="width:13px;height:13px;"></i> Edit
            </button>
            <button onclick="hapusMenu(${menu.id}, '${menu.nama.replace(/'/g, "\\'")}')" class="btn btn-danger btn-sm" style="width:auto;">
              <i data-lucide="trash-2" style="width:13px;height:13px;"></i> Hapus
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
  lucide.createIcons();
}

function openMenuModal(mode) {
  modalMode = mode;
  document.getElementById('menuForm').reset();
  document.getElementById('menuIdField').value = '';
  base64Gambar = ''; // Reset penampung base64
  document.getElementById('imgPreview').src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500';
  document.getElementById('modalTitle').textContent = mode === 'add' ? 'Tambah Menu Baru' : 'Edit Data Menu';
  document.getElementById('isFavoritMenu').checked = false;
  toggleHargaVarian();
  document.getElementById('menuModal').classList.add('show');
  lucide.createIcons();
}

function closeMenuModal() {
  document.getElementById('menuModal').classList.remove('show');
}

function editMenuPrep(id) {
  const menu = allMenus.find(m => m.id === id);
  if (!menu) return;
  openMenuModal('edit');
  document.getElementById('menuIdField').value = menu.id;
  document.getElementById('namaMenu').value    = menu.nama;
  document.getElementById('hargaMenu').value   = menu.harga;
  document.getElementById('kategoriMenu').value= menu.kategori;
  document.getElementById('deskripsiMenu').value = menu.deskripsi || '';
  document.getElementById('isHotIceMenu').checked = !!menu.is_hot_ice;
  document.getElementById('isFavoritMenu').checked = !!menu.is_favorit;
  document.getElementById('hargaHotMenu').value = menu.harga_hot || '';
  document.getElementById('hargaIceMenu').value = menu.harga_ice || '';
  toggleHargaVarian();
  base64Gambar = menu.gambar || ''; // Masukkan data gambar lama
  document.getElementById('imgPreview').src = base64Gambar || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500';
}

async function submitMenu() {
  const id         = document.getElementById('menuIdField').value;
  const nama       = document.getElementById('namaMenu').value.trim();
  const deskripsi  = document.getElementById('deskripsiMenu').value.trim();
  const harga      = document.getElementById('hargaMenu').value;
  const kategori   = document.getElementById('kategoriMenu').value;
  const is_hot_ice = document.getElementById('isHotIceMenu').checked;
  const is_favorit = document.getElementById('isFavoritMenu').checked;
  const harga_hot  = document.getElementById('hargaHotMenu').value;
  const harga_ice  = document.getElementById('hargaIceMenu').value;
  const gambar     = base64Gambar; // Menggunakan string Base64 yang sudah dibaca

  if (!nama || (!is_hot_ice && !harga) || (is_hot_ice && (!harga_hot || !harga_ice))) { 
    alert('Mohon isi nama menu dan harga secara lengkap.'); 
    return; 
  }

  const url    = modalMode === 'edit' ? `/api/menu/${id}` : '/api/menu';
  const method = modalMode === 'edit' ? 'PUT' : 'POST';

  const btn = document.getElementById('btnSimpanMenu');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-circle" style="width:14px;height:14px;"></i> Menyimpan...';
  lucide.createIcons();

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ nama, harga, kategori, gambar, deskripsi, is_hot_ice, harga_hot, harga_ice, is_favorit })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.pesan || 'Gagal menyimpan.');
    closeMenuModal();
    loadMenus();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save" style="width:14px;height:14px;"></i> Simpan Menu';
    lucide.createIcons();
  }
}

async function hapusMenu(id, nama) {
  if (!confirm(`Hapus menu "${nama}"? Tindakan ini tidak dapat dibatalkan.`)) return;
  try {
    const res = await fetch(`/api/menu/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.pesan || 'Gagal menghapus.');
    loadMenus();
  } catch (err) {
    alert(err.message);
  }
}

function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_username');
  window.location.href = '/admin/login.html';
}

// Tutup modal klik di luar
document.getElementById('menuModal').addEventListener('click', function(e) {
  if (e.target === this) closeMenuModal();
});

async function initPage() {
  await loadCategories();
  await loadMenus();
}
initPage();
