/**
 * ==============================================================================
 * SKRIP AUTENTIKASI LOGIN ADMINISTRATOR (frontend/admin/js/login.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini mengelola proses masuk (Login) akun Admin:
 * 1. Proteksi halaman login (jika sudah punya token, alihkan ke dashboard).
 * 2. Mengirimkan kredensial ke `POST /api/auth/login` via `API.post()`.
 * 3. Menyimpan token JWT dan username di LocalStorage (`admin_token` & `admin_username`).
 * 4. Mengalihkan ke `dashboard.html` setelah autentikasi sukses.
 * ==============================================================================
 */

lucide.createIcons();

// 1. Proteksi Halaman Login
if (API.getToken()) {
  window.location.href = '/admin/dashboard.html';
}

/**
 * 2. Mengubah visibilitas kolom input password (tampilkan/sembunyikan)
 */
let pwVisible = false;
function togglePw() {
  pwVisible = !pwVisible;
  document.getElementById('password').type = pwVisible ? 'text' : 'password';
  document.getElementById('eyeIcon').setAttribute('data-lucide', pwVisible ? 'eye-off' : 'eye');
  lucide.createIcons();
}

/**
 * 3. Penanganan Form Login Admin
 */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    alert('Username dan password wajib diisi.');
    return;
  }

  const btn = document.getElementById('btnLogin');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-circle" style="width:18px;height:18px;animation: spin 1s linear infinite;"></i> Memverifikasi...';
  lucide.createIcons();

  try {
    const data = await API.post('/api/auth/login', { username, password });

    // Simpan token JWT dan nama admin ke localStorage
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_username', data.user.username);
    
    // Redirect ke dashboard admin
    window.location.href = '/admin/dashboard.html';
  } catch (err) {
    alert(err.message || 'Login gagal. Periksa username dan password Anda.');
    btn.disabled = false;
    btn.innerHTML = 'Masuk';
    lucide.createIcons();
  }
});
