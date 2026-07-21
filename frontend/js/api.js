/**
 * ==============================================================================
 * HTTP CLIENT & UTILS HELPER FRONTEND (frontend/js/api.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * File ini bertindak sebagai API Client Helper terpusat untuk komunikasi antara 
 * Frontend (HTML/JS) dan Backend REST API Node.js/Express.
 * 
 * MENGAPA PENTING (Prinsip Clean Code - DRY & Centralized API Client):
 * 1. Menghilangkan penulisan `fetch()`, penanganan header auth JWT, dan `res.json()` berulang.
 * 2. Menyediakan helper umum seperti pembulatan harga Rupiah (`formatRupiah`).
 * 3. Menyediakan manajemen token autentikasi Admin secara aman di `localStorage`.
 * ==============================================================================
 */

// Object global API Client untuk diakses oleh file JS lainnya
const API = {
  /**
   * Mengambil token JWT Admin dari localStorage (mendukung 'admin_token' dan 'token')
   */
  getToken() {
    return localStorage.getItem('admin_token') || localStorage.getItem('token');
  },

  /**
   * Menyimpan token JWT Admin ke localStorage
   */
  setToken(token) {
    localStorage.setItem('token', token);
  },

  /**
   * Menghapus token JWT Admin (Logout)
   */
  removeToken() {
    localStorage.removeItem('token');
  },

  /**
   * Wrapper dasar panggilan HTTP Fetch dengan penanganan token & error terpusat
   * @param {string} endpoint - Path API (misal: '/api/menu')
   * @param {Object} options - Opsi Fetch (method, body, headers, dll)
   */
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Otomatis sertakan header Authorization jika token admin tersedia
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.pesan || `HTTP Error ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error.message);
      throw error;
    }
  },

  // HTTP Method Helpers:
  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  },

  post(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body), headers });
  },

  put(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body), headers });
  },

  patch(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body), headers });
  },

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
};

/**
 * Utility helper untuk memformat angka menjadi mata uang Rupiah (contoh: 15000 -> "Rp 15.000")
 * @param {number} amount 
 * @returns {string}
 */
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}
