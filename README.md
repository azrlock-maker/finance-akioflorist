# Finance AKIO FLORIST (Frontend PWA)

Aplikasi pembukuan papan bunga **offline-first**. Repo ini berisi **frontend saja** (HTML/CSS/JS + service worker). Kode Python/SQLite untuk aplikasi desktop **tidak** disimpan di sini.

## Cara pakai

1. Buka lewat server statik, misalnya:
   ```
   python -m http.server 8000
   ```
   lalu buka `http://localhost:8000`. Bisa juga langsung memakai GitHub Pages.
2. Masuk ke menu **Pengaturan & Sync**.
3. Isi **PIN Sync Toko** (minimal 6 huruf/angka), lalu klik **Hubungkan**.
4. Gunakan PIN yang sama di PC dan HP agar data tersinkron realtime.

PIN **tidak** ditanam di kode dan **tidak** ikut ke GitHub — PIN hanya tersimpan di `localStorage` perangkat.

## Cloud & keamanan

- Sinkron realtime memakai **Firebase Realtime Database** Google.
- Backup opsional memakai **Google Drive** lewat OAuth.
- URL Firebase dan OAuth Client ID bersifat publik; yang harus dijaga adalah **Firebase Rules** (jangan `read/write: true` tanpa auth) dan **PIN toko**.
- `data_initial.json`, `*.db`, folder backup, dan `data/signing-key.enc.json` sudah masuk `.gitignore`. Jangan commit data pelanggan nyata atau kunci privat.

## Verifikasi QR nota (anti-palsu)

- Nota A4 dan nota hutang memakai tanda tangan **ECDSA P-256 / SHA-256**.
- Kunci privat **hanya ada di komputer toko**, tersimpan terenkripsi di `web/data/signing-key.enc.json` (PBKDF2-SHA256 + AES-GCM). Kata sandinya harus diisi tiap kali aplikasi dibuka lewat menu **Pengaturan & Sync → Buka kunci**.
- Hanya **kunci publik** yang disimpan di `js/verifikasi-kunci.js` dan ikut ke GitHub. Kode lama yang menanamkan secret HMAC di `js/modules/pesanan.js` sudah dihapus.
- QR selalu mengarah ke halaman verifikasi resmi: <https://azrlock-maker.github.io/finance-akioflorist/>. Halaman itu **benar-benar memverifikasi** tanda tangan sebelum menampilkan status "SAH & RESMI".
- QR lama bertanda 12 hex HMAC ditampilkan sebagai **FORMAT LAMA / tidak terverifikasi**, bukan "asli".
- Verifikasi bersifat statis: tidak ada pengecekan duplikat atau pembatalan nomor secara global.

## Catatan deploy

`index.html`, `manifest.json`, aset CSS/JS, dan `sw.js` memakai cache buster `?v=42`. Saat mengubah file JS/CSS, naikkan nomor versi tersebut **dan** `CACHE_NAME` di `sw.js` agar browser tidak menyajikan versi lama.
