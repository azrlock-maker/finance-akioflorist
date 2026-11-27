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
- Kunci privat **tidak pernah masuk repo**. Di komputer toko tersimpan terenkripsi di `web/data/signing-key.enc.json` (PBKDF2-SHA256 + AES-GCM); jika memakai Worker, berkas yang sama disimpan sebagai secret `SIGNING_KEY_BOX`. Kata sandinya harus diisi tiap kali Menandatangani nota.
- Jika menu Pengaturan sulit ditemukan, buka langsung **`http://localhost:8000/#pengaturan`**.
- Setelah **Ganti kata sandi**, aplikasi mengunduh berkas kunci baru. Timpa `web/data/signing-key.enc.json` dengan berkas itu supaya kata sandi baru berlaku juga saat browser dibuka ulang atau dipakai komputer lain.
- Jika kata sandi yang dulu berhasil tiba-tiba ditolak, buka **Pengaturan & Sync** lalu klik **↺ Muat ulang dari file**. Tombol ini membuang salinan kunci lama di browser dan membaca ulang `web/data/signing-key.enc.json`.
- Hanya **kunci publik** yang disimpan di `js/verifikasi-kunci.js` dan ikut ke GitHub. Kode lama yang menanamkan secret HMAC di `js/modules/pesanan.js` sudah dihapus.
- QR selalu mengarah ke halaman verifikasi resmi: <https://azrlock-maker.github.io/finance-akioflorist/>. Halaman itu **benar-benar memverifikasi** tanda tangan sebelum menampilkan status "SAH & RESMI".
- QR lama bertanda 12 hex HMAC ditampilkan sebagai **FORMAT LAMA / tidak terverifikasi**, bukan "asli".
- Verifikasi bersifat statis: tidak ada pengecekan duplikat atau pembatalan nomor secara global.

## Buat QR nota dari halaman publik (Cloudflare Worker)

GitHub Pages hanya statis dan tidak boleh menyimpan kunci privat. Jika nota harus dibuat dari domain publik, deploy Worker di folder `worker/`:

```powershell
npm install -g wrangler
wrangler login
cd worker
# Jangan menempel manual ke prompt (JSON multiline bisa rusak). Pipe langsung dari file:
Get-Content 'D:\Installer Mesin Styrofoam\FINANCE\web\data\signing-key.enc.json' -Raw | wrangler secret put SIGNING_KEY_BOX
wrangler deploy
```

Salin URL deployment (misalnya `https://akio-finance-sign.<akun>.workers.dev/sign`) ke menu **Pengaturan & Sync → URL Worker Penandatanganan** di browser yang dipakai. Saat membuat nota, aplikasi akan meminta kata sandi kunci lalu mengirimkan data nota ke Worker untuk ditandatangani.

Klik **🧪 Uji Worker & kata sandi** di Pengaturan sebelum mencetak nota. Tombol ini melaporkan error sebenarnya (misalnya kata sandi lama), daripada pesan umum "kunci belum terbuka".

Jangan pernah menyimpan kata sandi kunci sebagai secret Worker; kata sandi diminta per request dan hanya disimpan di `sessionStorage` browser.

## Catatan deploy

`index.html`, `manifest.json`, aset CSS/JS, dan `sw.js` memakai cache buster `?v=48`. Saat mengubah file JS/CSS, naikkan nomor versi tersebut **dan** `CACHE_NAME` di `sw.js` agar browser tidak menyajikan versi lama.
