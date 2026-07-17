lucide.createIcons();

// Redirect jika sudah login
if (localStorage.getItem('admin_token')) {
  window.location.href = 'dashboard.html';
}

// Toggle visibilitas password
let pwVisible = false;
function togglePw() {
  pwVisible = !pwVisible;
  document.getElementById('password').type = pwVisible ? 'text' : 'password';
  document.getElementById('eyeIcon').setAttribute('data-lucide', pwVisible ? 'eye-off' : 'eye');
  lucide.createIcons();
}

// Submit Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnLogin');
  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-circle" style="width:18px;height:18px;animation: spin 1s linear infinite;"></i> Memverifikasi...';
  lucide.createIcons();

  try {
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

    localStorage.setItem('admin_token',    data.token);
    localStorage.setItem('admin_username', data.user.username);
    window.location.href = 'dashboard.html';
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.innerHTML = 'Masuk';
    lucide.createIcons();
  }
});
