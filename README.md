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
- `data_initial.json`, `*.db`, dan folder backup sudah masuk `.gitignore`. Jangan commit data pelanggan nyata.

## Catatan deploy

`index.html`, `manifest.json`, aset CSS/JS, dan `sw.js` memakai cache buster `?v=41`. Saat mengubah file JS/CSS, naikkan nomor versi tersebut **dan** `CACHE_NAME` di `sw.js` agar browser tidak menyajikan versi lama.
