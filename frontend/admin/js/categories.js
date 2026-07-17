lucide.createIcons();
const token = localStorage.getItem('admin_token');
if (!token) { alert('Akses ditolak.'); window.location.href = 'login.html'; }

let allCategories = [];
let modalMode = 'add';

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error();
    allCategories = await res.json();
    renderCatTable();
  } catch {
    alert('Gagal mengambil daftar kategori.');
  }
}

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

function openCatModal(mode) {
  modalMode = mode;
  document.getElementById('catForm').reset();
  document.getElementById('catIdField').value = '';
  document.getElementById('modalTitle').textContent = mode === 'add' ? 'Tambah Kategori Baru' : 'Edit Nama Kategori';
  document.getElementById('catModal').classList.add('show');
  lucide.createIcons();
}

function closeCatModal() {
  document.getElementById('catModal').classList.remove('show');
}

function editCatPrep(id) {
  const cat = allCategories.find(c => c.id === id);
  if (!cat) return;
  openCatModal('edit');
  document.getElementById('catIdField').value = cat.id;
  document.getElementById('namaKategori').value = cat.nama;
}

async function submitCat() {
  const id   = document.getElementById('catIdField').value;
  const nama = document.getElementById('namaKategori').value.trim();

  if (!nama) { alert('Nama kategori wajib diisi.'); return; }

  const url    = modalMode === 'edit' ? `/api/categories/${id}` : '/api/categories';
  const method = modalMode === 'edit' ? 'PUT' : 'POST';

  const btn = document.getElementById('btnSimpanCat');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-circle" style="width:14px;height:14px;"></i> Menyimpan...';
  lucide.createIcons();

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ nama })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.pesan || 'Gagal menyimpan.');
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

async function hapusCat(id, nama) {
  if (!confirm(`Hapus kategori "${nama}"? Menu yang terikat dengan kategori ini tidak akan otomatis terhapus.`)) return;
  try {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.pesan || 'Gagal menghapus.');
    loadCategories();
  } catch (err) {
    alert(err.message);
  }
}

function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_username');
  window.location.href = 'login.html';
}

document.getElementById('catModal').addEventListener('click', function(e) {
  if (e.target === this) closeCatModal();
});

loadCategories();
