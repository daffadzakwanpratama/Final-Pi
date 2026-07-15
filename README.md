# Dokumentasi Proyek: Sistem QR Ordering (Uncle Joe)

Dokumentasi ini disusun sebagai panduan teknis dan akademis untuk proyek **Sistem QR Ordering berbasis Web (Uncle Joe)**, yang dirancang khusus untuk memenuhi standar penulisan laporan penelitian **Penulisan Ilmiah (PI)**.

Sistem ini memfokuskan pada pemesanan menu makanan/minuman secara mandiri menggunakan teknologi QR Code/Input nomor meja guna meningkatkan efisiensi operasional kafe/warung kopi.

---

## 1. Identitas Sistem

* **Nama Aplikasi**: Uncle Joe
* **Tujuan**: Memangkas antrean di kasir dengan mendigitalisasi proses pemesanan dari meja pelanggan secara real-time.
* **Arsitektur**: Client-Server berbasis REST API.
* **Jumlah Aktor**: 2 Aktor (Pelanggan dan Admin).

---

## 2. Aktor & Hak Akses

1. **Pelanggan (Public)**
   * Memasukkan nomor meja (simulasi scan QR Code).
   * Melihat daftar menu yang aktif berdasarkan kategori (Minuman, Makanan, Snack).
   * Memasukkan menu ke keranjang belanja virtual (disimpan di `localStorage` browser).
   * Melakukan checkout pesanan.
   * Memantau progres pembuatan pesanan secara real-time (Polling 10 detik sekali).

2. **Admin (Authenticated)**
   * Melakukan autentikasi menggunakan Username & Password (enkripsi Bcrypt & token JWT).
   * Mengakses panel Dashboard statistik pesanan.
   * Mengelola data menu (CRUD: Create, Read, Update, Delete) dengan fitur preview gambar instan.
   * Mengelola antrean pesanan menggunakan prinsip **FIFO (First-In, First-Out)**:
     * Antrean yang paling lama (belum diproses) selalu berada di urutan paling atas.
     * Mengubah status pesanan secara linear: `Menunggu` -> `Diproses` -> `Siap` -> `Selesai`.
     * Transaksi yang sudah `Selesai` otomatis dipindahkan ke baris paling bawah.

---

## 3. Teknologi yang Digunakan

### Frontend (Client-Side)
* **HTML5**: Menyusun struktur semantik halaman web.
* **CSS3 (Vanilla)**: Desain UI responsif premium dengan tema warna coklat kopi (`#5c3a1e`) & putih bersih, transisi halus, serta tata letak modern.
* **Vanilla JavaScript (ES6+)**: Logika interaktif frontend (state management keranjang belanja, manipulasi DOM, AJAX request menggunakan `fetch API`, manipulasi URL, token parsing).
* **Lucide Icons**: Library visual ikon berbasis SVG via CDN untuk mendukung tampilan modern.

### Backend (Server-Side)
* **Node.js**: Runtime environment JavaScript di sisi server.
* **Express.js**: Framework minimalis untuk routing REST API dan penyedia file statis frontend.
* **pg (node-postgres)**: Driver PostgreSQL non-blocking untuk interaksi database langsung (Raw SQL Query).
* **jsonwebtoken (JWT)**: Media pertukaran data token keamanan yang digunakan untuk otorisasi akses Admin.
* **bcryptjs**: Pustaka hashing password satu arah untuk keamanan kredensial admin di database.
* **dotenv**: Mengelola variabel konfigurasi sensitif (port, kredensial DB, JWT key) melalui file `.env`.

### Database (Penyimpanan Data)
* **PostgreSQL**: Relational Database Management System (RDBMS) tangguh untuk menyimpan relasi tabel user, menu, dan pesanan secara terstruktur.

---

## 4. Skema Database (RDBMS)

Sistem menggunakan 4 tabel utama yang terhubung satu sama lain:

```text
1. users       -> id (PK), username, password
2. menu        -> id (PK), nama, harga, kategori, gambar
3. orders      -> id (PK), nomor_meja, tanggal, status
4. order_items -> id (PK), order_id (FK), menu_id (FK), qty, subtotal
```

---

## 5. Alur Kerja Sistem (Workflow)

### A. Alur Kerja Pelanggan
1. **Masuk ke Sistem**: Pelanggan memindai QR Code di meja (disimulasikan dengan memasukkan nomor meja pada halaman `index.html`).
2. **Pilih Menu**: Masuk ke `menu.html`, pelanggan melihat daftar makanan/minuman, dapat memfilter per kategori, dan memilih menu untuk dimasukkan ke keranjang belanja.
3. **Konfirmasi Pesanan (Checkout)**: Di halaman `cart.html` & `checkout.html`, pelanggan melihat ringkasan item, mengisi nomor meja, lalu mengirim pesanan ke server.
4. **Pantau Progres**: Pelanggan diarahkan ke `status.html`. Halaman melakukan fetch data status pesanan setiap 10 detik guna mengetahui apakah pesanan masih `Menunggu`, sedang `Diproses` barista, `Siap` diambil, atau transaksi telah `Selesai`.

### B. Alur Kerja Admin
1. **Login**: Admin masuk melalui `admin/login.html` menggunakan username dan password terenkripsi. Server mengembalikan JWT Token untuk otorisasi selanjutnya.
2. **Pantau Dashboard**: Admin diarahkan ke `admin/dashboard.html` untuk memantau ringkasan statistik harian (jumlah menu, jumlah pesanan, pesanan menunggu, pesanan diproses).
3. **Kelola Menu**: Pada `admin/menu.html`, admin dapat menambah, mengedit, atau menghapus item menu dengan mengunggah teks URL gambar.
4. **Kelola Antrean (FIFO)**: Di halaman `admin/orders.html`, admin memproses pesanan secara terurut:
   * Pesanan yang masuk pertama kali (tertua) berada paling atas agar ditangani terlebih dahulu (FIFO).
   * Mengklik tombol "Mulai Proses" untuk mengubah status ke `Diproses`.
   * Mengklik "Tandai Siap" saat hidangan selesai diracik (status menjadi `Siap` untuk diambil pelanggan).
   * Mengklik "Selesaikan" ketika pelanggan telah mengambil barang dan membayar di kasir (status `Selesai`, langsung terlempar ke baris terbawah antrean).

---

## 6. Struktur Direktori Proyek

```text
├── backend/
│   ├── middleware/
│   │   └── auth.js         # Validasi token keamanan JWT Admin
│   ├── routes/
│   │   ├── auth.js         # API endpoint registrasi & login admin
│   │   ├── menu.js         # API endpoint CRUD menu makanan/minuman
│   │   └── orders.js       # API endpoint transaksi & status pesanan
│   ├── db.js               # Koneksi database pool & inisialisasi skema tabel otomatis
│   ├── init.sql            # Script SQL pembuatan tabel database & data bawaan (seeder)
│   └── server.js           # Entry point utama aplikasi Express.js
├── frontend/
│   ├── admin/
│   │   ├── dashboard.html  # Halaman beranda kontrol statistik admin
│   │   ├── login.html      # Halaman masuk untuk otentikasi admin
│   │   ├── menu.html       # Halaman manajemen CRUD menu
│   │   └── orders.html     # Halaman antrean FIFO pengelolaan pesanan
│   ├── css/
│   │   └── style.css       # File stylesheet desain UI/UX terpadu
│   ├── cart.html           # Keranjang belanja pelanggan
│   ├── checkout.html       # Formulir konfirmasi checkout pesanan
│   ├── index.html          # Landing page simulasi scan QR meja
│   ├── menu.html           # Katalog menu publik pelanggan
│   └── status.html         # Status real-time tracker pesanan
├── .env                    # Konfigurasi environment (DB, Port, Secret Key)
├── package.json            # Daftar dependensi aplikasi Node.js
└── README.md               # File dokumentasi (Dokumen ini)
```

---

## 7. Cara Menjalankan Proyek

### 1. Prasyarat
* Install [Node.js](https://nodejs.org/) versi LTS.
* Install [PostgreSQL](https://www.postgresql.org/) pada lokal server komputer Anda.

### 2. Setup Database PostgreSQL
1. Buat database baru bernama `qr_ordering`:
   ```sql
   CREATE DATABASE qr_ordering;
   ```

### 3. Konfigurasi Variabel Lingkungan (`.env`)
Buat file bernama `.env` di direktori utama (root) proyek, lalu sesuaikan isinya:
```env
PORT=3281
JWT_SECRET=kopi_qr_secret_key_123

# Konfigurasi Database PostgreSQL Anda
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=qr_ordering
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
DB_PORT=5432
```

### 4. Instalasi Dependensi Node.js
Jalankan perintah berikut di Command Prompt / Terminal pada direktori root proyek untuk menginstal semua library:
```bash
npm install
```

### 5. Menjalankan Aplikasi
Mulai server Node.js dengan perintah:
```bash
npm start
```
*Saat pertama kali dijalankan, sistem secara otomatis mengeksekusi file `backend/init.sql` untuk membuat seluruh tabel dan menginputkan menu bawaan (Seeder) serta kredensial admin default.*

* **Akun Admin Bawaan**:
  * **Username**: `admin`
  * **Password**: `admin123`

### 6. Pengujian Halaman
* **Akses Pelanggan**: Buka [http://localhost:3281](http://localhost:3281) di browser Anda.
* **Akses Panel Admin**: Buka [http://localhost:3281/admin/login.html](http://localhost:3281/admin/login.html).
