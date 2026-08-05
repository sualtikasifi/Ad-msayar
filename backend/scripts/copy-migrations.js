// tsc .sql/.html dosyalarını derlemez; migration'ları ve statik dosyaları dist'e kopyalar.
// Hem yerelde (Windows) hem Render'da (Linux) çalışır.
const fs = require('fs');
const path = require('path');

const migrationsSrc = path.join(__dirname, '..', 'src', 'db', 'migrations');
const migrationsDest = path.join(__dirname, '..', 'dist', 'db', 'migrations');

fs.mkdirSync(migrationsDest, { recursive: true });
fs.cpSync(migrationsSrc, migrationsDest, { recursive: true });

const count = fs.readdirSync(migrationsDest).filter((f) => f.endsWith('.sql')).length;
console.log(`Copied ${count} migration files to dist/db/migrations`);

const publicSrc = path.join(__dirname, '..', 'src', 'public');
const publicDest = path.join(__dirname, '..', 'dist', 'public');

fs.mkdirSync(publicDest, { recursive: true });
fs.cpSync(publicSrc, publicDest, { recursive: true });
console.log('Copied public/ assets to dist/public');
