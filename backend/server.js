// Entry point utama server Node.js & Express.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3281;

// Middleware global
app.use(cors());
app.use(express.json()); // Parsing JSON request body

// Menghubungkan rute-rute REST API
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

// Melayani file statis dari folder frontend
// Memungkinkan membuka aplikasi langsung lewat http://localhost:PORT
app.use(express.static(path.join(__dirname, '../frontend')));

// Rute fallback untuk mengarahkan ke frontend/index.html jika ada request non-API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Menjalankan server Express
app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(` Server Uncle Joe berjalan di port ${PORT}      `);
  console.log(` Halaman Pengguna: http://localhost:${PORT}      `);
  console.log(` Panel Admin     : http://localhost:${PORT}/admin/login.html`);
  console.log(`================================================`);
});
