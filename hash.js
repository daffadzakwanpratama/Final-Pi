/**
 * ==============================================================================
 * SKRIP UTILITAS HASH BCRYPT PASSWORD (hash.js)
 * ==============================================================================
 * 
 * TUJUAN & FUNGSI FILE:
 * Membuat hash satu arah terenkripsi menggunakan Bcrypt dari argumen password 
 * yang dimasukkan pada terminal.
 * 
 * ALUR KERJA (DATA FLOW):
 * Input: `node hash.js passwordku123`
 * Output: Menghasilkan string hash Bcrypt siap pakai untuk disisipkan ke database.
 * ==============================================================================
 */
const bcrypt = require('bcryptjs');

// Mengambil argumen password dari command line, jika kosong gunakan default 'kopi123'
const password = process.argv[2];

if (!password) {
  console.log('======================================================');
  console.log('Silakan ketik password yang ingin di-hash setelah perintah.');
  console.log('Contoh: node hash.js passwordku123');
  console.log('======================================================');
  process.exit(0);
}

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('======================================================');
console.log('INPUT PASSWORD :', password);
console.log('HASH BCRYPT    :', hash);
console.log('======================================================');
