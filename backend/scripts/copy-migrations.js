// tsc .sql dosyalarını derlemez; migration'ları dist'e kopyalar.
// Hem yerelde (Windows) hem Render'da (Linux) çalışır.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'db', 'migrations');
const dest = path.join(__dirname, '..', 'dist', 'db', 'migrations');

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });

const count = fs.readdirSync(dest).filter((f) => f.endsWith('.sql')).length;
console.log(`Copied ${count} migration files to dist/db/migrations`);
