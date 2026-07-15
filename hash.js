// Script utilitas untuk membuat hash password Bcrypt
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
