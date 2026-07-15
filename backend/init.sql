-- Inisialisasi Database QR Ordering

-- 1. Tabel Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- 2. Tabel Menu
CREATE TABLE IF NOT EXISTS menu (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    harga INT NOT NULL,
    gambar TEXT, -- Berisi URL gambar
    kategori VARCHAR(50) NOT NULL
);

-- 3. Tabel Orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    nomor_meja VARCHAR(10) NOT NULL,
    tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Menunggu' -- 'Menunggu', 'Diproses', 'Siap', 'Selesai'
);

-- 4. Tabel Order Items (Detail item pesanan)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    menu_id INT REFERENCES menu(id) ON DELETE SET NULL,
    qty INT NOT NULL,
    subtotal INT NOT NULL
);
