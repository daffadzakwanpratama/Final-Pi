// =================================================================
// Skrip Halaman Login Administrator (login.js)
// Deskripsi: Mengelola autentikasi admin, penyimpanan token JWT, 
//            dan proteksi halaman login jika sudah terautentikasi.
// =================================================================

// Inisialisasi ikon Lucide di halaman login
lucide.createIcons();

// 1. Proteksi Halaman Login
// Deskripsi: Jika token admin sudah ada di localStorage, langsung alihkan ke Dashboard
if (localStorage.getItem('admin_token')) {
  window.location.href = '/admin/dashboard.html';
}

// 2. Fungsi togglePw
// Deskripsi: Mengubah visibilitas kolom input password (tampilkan/sembunyikan karakter)
let pwVisible = false;
function togglePw() {
  pwVisible = !pwVisible;
  document.getElementById('password').type = pwVisible ? 'text' : 'password';
  document.getElementById('eyeIcon').setAttribute('data-lucide', pwVisible ? 'eye-off' : 'eye');
  lucide.createIcons();
}

// 3. Penanganan Submit Login Form
// Deskripsi: Mengirimkan kredensial admin ke API backend, menyimpan token, dan mengalihkan halaman
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Nonaktifkan tombol login dan tampilkan animasi loading spinner
  const btn = document.getElementById('btnLogin');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-circle" style="width:18px;height:18px;animation: spin 1s linear infinite;"></i> Memverifikasi...';
  lucide.createIcons();

  try {
    // Kirim request login ke backend API
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value.trim()
      })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.pesan || 'Login gagal.');

    // Simpan token JWT dan nama admin ke localStorage
    localStorage.setItem('admin_token',    data.token);
    localStorage.setItem('admin_username', data.user.username);
    
    // Alihkan ke halaman dashboard admin
    window.location.href = '/admin/dashboard.html';
  } catch (err) {
    // Tampilkan pesan kesalahan dan aktifkan kembali tombol login
    alert(err.message);
    btn.disabled = false;
    btn.innerHTML = 'Masuk';
    lucide.createIcons();
  }
});
