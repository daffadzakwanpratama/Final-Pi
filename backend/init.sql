-- Inisialisasi Database QR Ordering

-- 1. Tabel Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- 2. Tabel Kategori Dinamis
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(50) UNIQUE NOT NULL
);

-- Seed kategori default
INSERT INTO categories (nama) VALUES ('Minuman'), ('Makanan'), ('Snack') ON CONFLICT DO NOTHING;

-- 3. Tabel Menu
CREATE TABLE IF NOT EXISTS menu (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    harga INT NOT NULL,
    gambar TEXT, -- Berisi URL gambar/Base64
    kategori VARCHAR(50) NOT NULL,
    deskripsi TEXT,
    is_hot_ice BOOLEAN DEFAULT FALSE,
    harga_hot INT,
    harga_ice INT,
    is_favorit BOOLEAN DEFAULT FALSE
);

-- 4. Tabel Orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    nomor_meja VARCHAR(10) NOT NULL,
    nama_pelanggan VARCHAR(100) DEFAULT 'Pelanggan',
    tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Menunggu', -- 'Menunggu', 'Diproses', 'Siap', 'Selesai'
    metode_pembayaran VARCHAR(20) DEFAULT 'tunai', -- 'tunai' atau 'nontunai'
    status_pembayaran VARCHAR(20) DEFAULT 'Belum Bayar', -- 'Belum Bayar' atau 'Sudah Bayar'
    midtrans_token VARCHAR(100)
);

-- 5. Tabel Order Items (Detail item pesanan)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    menu_id INT REFERENCES menu(id) ON DELETE SET NULL,
    qty INT NOT NULL,
    subtotal INT NOT NULL,
    varian VARCHAR(20) -- 'Hot', 'Ice', atau NULL
);
