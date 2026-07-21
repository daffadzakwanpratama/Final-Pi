/**
 * ==============================================================================
 * SKRIP KELOLA KATEGORI ADMINISTRATOR (frontend/admin/js/categories.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini bertindak sebagai penanggung jawab antarmuka CRUD Kategori:
 * 1. Proteksi sesi Admin via JWT Token.
 * 2. Menampilkan tabel daftar kategori.
 * 3. Menangani form Modal Tambah/Edit Kategori.
 * 4. Menghapus kategori via `API.delete()`.
 * ==============================================================================
 */

lucide.createIcons();

// 1. Validasi Sesi Admin
const token = API.getToken();
if (!token) { 
  alert('Akses ditolak.'); 
  window.location.href = '/admin/login.html'; 
}

let allCategories = [];
let modalMode = 'add';

/**
 * 2. Mengambil seluruh data kategori dari API backend
 */
async function loadCategories() {
  try {
    allCategories = await API.get('/api/categories');
    renderCatTable();
  } catch (err) {
    alert('Gagal mengambil daftar kategori: ' + err.message);
  }
}

/**
 * 3. Merender tabel kategori
 */
function renderCatTable() {
  const tbody = document.getElementById('catTableBody');
  if (!allCategories.length) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:var(--space-8);color:var(--text-muted);">
      <i data-lucide="package-open" style="width:32px;height:32px;margin:0 auto var(--space-3) auto;display:block;"></i>
      Belum ada kategori terdaftar. Tambahkan kategori baru.
    </td></tr>`;
    lucide.createIcons();
    return;
  }

  tbody.innerHTML = allCategories.map(cat => {
    return `
      <tr>
        <td style="color:var(--text-muted);font-size:0.82rem;">#${cat.id}</td>
        <td style="font-weight:600;color:var(--text-primary);">${cat.nama}</td>
        <td>
          <div style="display:flex;gap:var(--space-2);">
            <button onclick="editCatPrep(${cat.id})" class="btn btn-secondary btn-sm" style="width:auto;">
              <i data-lucide="pencil" style="width:13px;height:13px;"></i> Edit
            </button>
            <button onclick="hapusCat(${cat.id}, '${cat.nama.replace(/'/g, "\\'")}')" class="btn btn-danger btn-sm" style="width:auto;">
              <i data-lucide="trash-2" style="width:13px;height:13px;"></i> Hapus
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
  lucide.createIcons();
}

/**
 * 4. Membuka modal input kategori
 */
function openCatModal(mode) {
  modalMode = mode;
  document.getElementById('catForm').reset();
  document.getElementById('catIdField').value = '';
  document.getElementById('modalTitle').textContent = mode === 'add' ? 'Tambah Kategori Baru' : 'Edit Nama Kategori';
  document.getElementById('catModal').classList.add('show');
  lucide.createIcons();
}

/**
 * 5. Menutup modal
 */
function closeCatModal() {
  document.getElementById('catModal').classList.remove('show');
}

/**
 * 6. Mempersiapkan modal edit
 */
function editCatPrep(id) {
  const cat = allCategories.find(c => c.id === id);
  if (!cat) return;
  openCatModal('edit');
  document.getElementById('catIdField').value = cat.id;
  document.getElementById('namaKategori').value = cat.nama;
}

/**
 * 7. Menyimpan kategori baru/perubahan ke API
 */
async function submitCat() {
  const id   = document.getElementById('catIdField').value;
  const nama = document.getElementById('namaKategori').value.trim();

  if (!nama) { alert('Nama kategori wajib diisi.'); return; }

  const endpoint = modalMode === 'edit' ? `/api/categories/${id}` : '/api/categories';
  const btn = document.getElementById('btnSimpanCat');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-circle" style="width:14px;height:14px;"></i> Menyimpan...';
  lucide.createIcons();

  try {
    if (modalMode === 'edit') {
      await API.put(endpoint, { nama });
    } else {
      await API.post(endpoint, { nama });
    }
    closeCatModal();
    loadCategories();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save" style="width:14px;height:14px;"></i> Simpan Kategori';
    lucide.createIcons();
  }
}

/**
 * 8. Menghapus kategori
 */
async function hapusCat(id, nama) {
  if (!confirm(`Hapus kategori "${nama}"? Menu yang terikat dengan kategori ini tidak akan otomatis terhapus.`)) return;
  try {
    await API.delete(`/api/categories/${id}`);
    loadCategories();
  } catch (err) {
    alert(err.message);
  }
}

/**
 * 9. Logout Admin
 */
function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_username');
  window.location.href = '/admin/login.html';
}

document.getElementById('catModal').addEventListener('click', function(e) {
  if (e.target === this) closeCatModal();
});

loadCategories();
