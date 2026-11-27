// Pengaturan Toko, Logo, Link Verifikasi Apps Script, & Google Drive Sync Module

let uploadedLogoBase64 = '';

async function renderPengaturanModule() {
  const container = document.getElementById('view-pengaturan');
  if (!container) return;

  const config = await db.pengaturan.get(1) || {
    nama_toko: 'AKIO FLORIST',
    tagline: 'Pusat Karangan Bunga',
    alamat: '',
    telepon: '',
    website_url: '',
    logo_path: '',
    gdrive_client_id: ''
  };

  uploadedLogoBase64 = config.logo_path || '';
  const activeClientId = typeof DEFAULT_GDRIVE_CLIENT_ID !== 'undefined' ? DEFAULT_GDRIVE_CLIENT_ID : (config.gdrive_client_id || localStorage.getItem('gdrive_client_id') || '');

  // Autoload GIS Auth jika client ID ada
  if (activeClientId && typeof initGoogleDriveAuth === 'function') {
    initGoogleDriveAuth(activeClientId);
  }

  let html = `
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:1.5rem;">
      <!-- Card Profil Toko & Logo -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🏪 Profil Toko & Logo Kwitansi</div>
        </div>

        <form id="form-pengaturan" onsubmit="savePengaturanForm(event)">
          <!-- Upload Logo Toko -->
          <div class="form-group">
            <label class="form-label">Logo Toko (Di Tampilkan pada Nota/Invoice)</label>
            <div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.75rem;">
              <div id="logo-preview-box" style="width:70px; height:70px; border:2px dashed var(--border-color); border-radius:10px; display:flex; align-items:center; justify-content:center; overflow:hidden; background:transparent;">
                ${uploadedLogoBase64 ? `<img src="${uploadedLogoBase64}" style="max-width:100%; max-height:100%; object-fit:contain;">` : '<span style="font-size:1.5rem;">🖼️</span>'}
              </div>
              <div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('logo-file-input').click()">🖼️ Pilih Gambar Logo</button>
                ${uploadedLogoBase64 ? '<button type="button" class="btn btn-danger btn-sm" style="margin-left:0.4rem;" onclick="removeLogoImage()">Hapus Logo</button>' : ''}
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;">Format: PNG / JPG / ICO</div>
              </div>
            </div>
            <input type="file" id="logo-file-input" style="display:none;" accept="image/*" onchange="handleLogoUpload(event)">
          </div>

          <div class="form-group">
            <label class="form-label">Nama Toko / Florist</label>
            <input type="text" name="nama_toko" class="form-control" value="${config.nama_toko || ''}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Tagline / Subtitle Nota</label>
            <input type="text" name="tagline" class="form-control" value="${config.tagline || ''}">
          </div>

          <div class="form-group">
            <label class="form-label">Alamat Toko</label>
            <textarea name="alamat" class="form-control" rows="2">${config.alamat || ''}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">No. Telepon / WhatsApp</label>
            <input type="text" name="telepon" class="form-control" value="${config.telepon || ''}">
          </div>

          <!-- Link Verifikasi Nota (Apps Script / Custom Web URL) -->
          <div class="form-group" style="background:rgba(37,99,235,0.1); border:1px solid rgba(37,99,235,0.3); padding:1rem; border-radius:10px;">
            <label class="form-label" style="color:#60a5fa;">🔗 Link Verifikasi Keaslian Nota (Google Apps Script / Web URL)</label>
            <input type="url" name="website_url" class="form-control" 
                   placeholder="Contoh: https://script.google.com/macros/s/.../exec atau https://toko-papan.vercel.app"
                   value="${config.website_url || ''}">
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem; line-height:1.4;">
              💡 <b>Fungsi:</b> URL ini akan otomatis dimasukkan ke dalam QR Code Nota. Saat pelanggan men-scan QR Code dengan HP, browser akan membuka link ini untuk memverifikasi keaslian nota secara otomatis.
            </p>
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1rem;">💾 Simpan Pengaturan Toko & Logo</button>
        </form>
      </div>

      <!-- Column Kanan: Sync & Backup Data -->
      <div style="display:flex; flex-direction:column; gap:1.5rem;">
        
        <!-- Card 1 (Utama): Realtime Cloud Sync -->
        <div class="card" style="margin-bottom:0;">
          <div class="card-header">
            <div class="card-title">📡 Realtime Cloud Sync (PC & HP)</div>
          </div>

          <div style="background:rgba(37, 99, 235, 0.12); border:1px solid rgba(37, 99, 235, 0.3); border-radius:10px; padding:1rem; margin-bottom:1.25rem;">
            <h4 style="color:#60a5fa; margin-bottom:0.3rem;">⚡ Sinkron Instan Beda Wi-Fi / Pakai Kuota 4G</h4>
            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4;">
              Cukup samakan <b>PIN Sync Toko</b> di PC dan HP Anda. Setiap kali ada pesanan baru/pelunasan, data langsung ter-update di layar HP dan PC <b>kurang dari 1 detik secara otomatis</b>.
            </p>
          </div>

          <div class="form-group">
            <label class="form-label">PIN Sync Toko (Pasangkan HP & PC)</label>
            <div style="display:flex; gap:0.5rem;">
              <input type="text" id="input-store-pin" class="form-control" style="font-weight:bold; letter-spacing:1px;" value="${localStorage.getItem('store_sync_pin') || ''}" placeholder="PIN rahasia Anda (min. 6 karakter)">
              <button class="btn btn-primary" onclick="handleSaveStorePin()">🔗 Hubungkan</button>
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem;">
              💡 Buat PIN sendiri minimal 6 huruf/angka, lalu samakan di HP & PC. PIN hanya disimpan di perangkat Anda, bukan di GitHub.
            </div>
          </div>

          <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:0.35rem;" onclick="triggerManualRealtimeSync()">
              <span>🧪</span> Tes Koneksi & Sinkron Sekarang
            </button>
          </div>

          <!-- Accordion Toggle untuk Setting Firebase Custom (Opsional) -->
          <details style="margin-top:1rem; font-size:0.85rem; color:var(--text-muted); cursor:pointer;">
            <summary style="font-weight:600; color:var(--accent-primary);">⚙️ Custom Firebase Database URL (Opsional / Proyek Sendiri)</summary>
            <div class="form-group" style="margin-top:0.75rem; padding:0.75rem; background:rgba(0,0,0,0.2); border-radius:8px;">
              <input type="url" id="input-firebase-url" class="form-control" style="font-size:0.85rem;" 
                     value="${localStorage.getItem('custom_firebase_url') || ''}" 
                     placeholder="https://akio-florist-finance-default-rtdb.asia-southeast1.firebasedatabase.app">
              <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.3rem;">Default: akio-florist-finance-default-rtdb.asia-southeast1.firebasedatabase.app</div>
              <button class="btn btn-secondary btn-sm" style="margin-top:0.5rem;" onclick="handleSaveCustomFirebaseUrl()">💾 Simpan URL Firebase Custom</button>
            </div>
          </details>
        </div>

        <!-- Card Kunci Tanda Tangan Nota (Anti-Palsu) -->
        <div class="card" style="margin-bottom:0; border:1px solid rgba(52,211,153,0.35);">
          <div class="card-header">
            <div class="card-title">🛡️ Kunci Tanda Tangan Nota (Anti-Palsu)</div>
          </div>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.85rem; line-height:1.45;">
            Kunci privat <b>tidak pernah dikirim ke GitHub</b>, dienkripsi dengan kata sandi (PBKDF2 + AES-GCM).
            Di komputer toko, kunci dibuka langsung di browser. Di halaman publik, penandatanganan dilakukan oleh Worker.
          </p>
          <div id="finance-key-status" style="font-size:0.82rem; margin-bottom:0.85rem; padding:0.65rem 0.75rem; border-radius:8px; background:rgba(148,163,184,0.12);">
            Memeriksa kunci…
          </div>
          <div class="form-group" id="finance-key-pass-group">
            <label class="form-label">Kata sandi kunci nota (komputer toko)</label>
            <input type="password" id="finance-key-pass" class="form-control" autocomplete="current-password" placeholder="••••••••••••••••••••">
          </div>
          <div class="form-group" id="finance-worker-pass-group" style="display:none;">
            <label class="form-label">Kata sandi kunci untuk Worker (sesi browser ini)</label>
            <div style="display:flex; gap:0.5rem;">
              <input type="password" id="finance-worker-pass" class="form-control" autocomplete="current-password" placeholder="••••••••••••••••••••">
              <button type="button" class="btn btn-secondary btn-sm" onclick="handleSaveFinanceWorkerPass()">💾 Simpan sesi</button>
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.4rem; line-height:1.4;">
              Kata sandi hanya disimpan di sesi browser ini, tidak dikirim ke GitHub. Akan diminta otomatis saat membuat nota kalau belum diisi.
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">URL Worker Penandatanganan (khusus halaman publik)</label>
            <div style="display:flex; gap:0.5rem;">
              <input type="url" id="finance-sign-url" class="form-control" value="${localStorage.getItem('finance_sign_url') || ''}" placeholder="https://akio-finance-sign.<akun>.workers.dev/sign">
              <button type="button" class="btn btn-secondary btn-sm" onclick="handleSaveFinanceSignUrl()">💾 Simpan</button>
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.4rem; line-height:1.4;">
              Isi URL Worker hasil deploy Cloudflare agar halaman publik bisa membuat QR nota.
            </div>
          </div>
          <div id="finance-worker-test" style="display:none; margin-bottom:0.85rem;">
            <button type="button" class="btn btn-primary btn-sm" onclick="handleTestFinanceSign()">🧪 Uji Worker & kata sandi</button>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.4rem; line-height:1.4;">
              Klik ini sebelum mencetak nota untuk memastikan Worker aktif dan kata sandi kunci benar.
            </div>
          </div>
          <div id="finance-key-local-buttons" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button type="button" class="btn btn-primary btn-sm" onclick="handleFinanceKeyUnlock()">🔓 Buka kunci</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="handleFinanceKeyChangePassword()">🔑 Ganti kata sandi</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="handleFinanceKeyExport()">📥 Ekspor kunci terenkripsi</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="handleFinanceKeyReloadFromFile()">↺ Muat ulang dari file</button>
          </div>
          <p id="finance-key-help" style="font-size:0.72rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.4;">
            Kata sandi tidak disimpan permanen (hanya selama tab ini terbuka). Kalau hilang, kunci tidak bisa dibuka dan nota harus dicetak ulang dengan kunci baru.<br>
            Jika kata sandi yang sebelumnya berhasil tiba-tiba ditolak, klik <b>Muat ulang dari file</b> untuk membuang salinan lama di browser.
          </p>
        </div>

        <!-- Card 2 (Pengaman): Backup / Restore File Lokal (.json) -->
        <div class="card" style="margin-bottom:0;">
          <div class="card-header">
            <div class="card-title">💾 Backup & Restore File Lokal (.json)</div>
          </div>

          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem; line-height:1.4;">
            Unduh salinan file backup fisik ke komputer/flashdisk untuk pengarsipan offline 100% aman.
          </p>

          <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" onclick="exportBackupJSONLokal()">📥 Download Backup (.json)</button>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('file-restore-input').click()">📤 Restore File (.json)</button>
            <input type="file" id="file-restore-input" style="display:none;" accept=".json" onchange="importBackupJSONLokal(event)">
          </div>
        </div>

        <!-- Card 3 (Zona Bahaya): Reset / Kosongkan Database Transaksi -->
        <div class="card" style="border: 1px solid rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.04); margin-bottom:0;">
          <div class="card-header">
            <div class="card-title" style="color: #ef4444; display: flex; align-items: center; gap: 0.5rem;">
              <span>⚠️ Zona Bahaya: Reset Database Transaksi</span>
            </div>
          </div>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem; line-height:1.4;">
            Fitur ini digunakan jika Anda ingin mengosongkan seluruh riwayat <b>Pesanan & Buku Kas Keuangan</b> (misalnya untuk memulai pembukuan baru). <b>Profil Toko & PIN Cloud tetap aman.</b><br>
            <span style="color:#ef4444; font-weight:600;">🛡️ Sistem akan otomatis mengunduh file backup .json ke komputer Anda sebelum data dihapus.</span>
          </p>
          <div>
            <button class="btn btn-danger btn-sm" style="background:#dc2626; border-color:#b91c1c;" onclick="handleResetDatabaseTransaksi()">
              🗑️ Reset / Kosongkan Seluruh Data Transaksi
            </button>
          </div>
        </div>

        <!-- Card 4 (Tambahan Opsional): Google Drive Backup -->
        <details style="font-size:0.85rem; color:var(--text-muted); cursor:pointer;" class="card">
          <summary style="font-weight:600; color:var(--text-muted);">☁️ Opsi Cadangan: Google Drive Auto-Sync (Opsional)</summary>
          <div style="margin-top:1rem;">
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">
              Fitur cadangan berbasis file Google Drive. <i>(Sudah digantikan oleh Realtime Sync di atas).</i>
            </p>
            <button class="btn btn-secondary btn-sm" onclick="loginGoogleDrive()">🔑 Login Google Drive</button>
          </div>
        </details>

      </div>
    </div>
  `;

  container.innerHTML = html;
  updateFinanceKeyStatus();
}

// === Kunci tanda tangan nota finance ===
async function updateFinanceKeyStatus() {
  const el = document.getElementById('finance-key-status');
  if (!el || !window.FinanceKey) return;
  try {
    const s = await window.FinanceKey.status();
    const localGroup = document.getElementById('finance-key-pass-group');
    const workerGroup = document.getElementById('finance-worker-pass-group');
    const localButtons = document.getElementById('finance-key-local-buttons');
    const workerTest = document.getElementById('finance-worker-test');
    const help = document.getElementById('finance-key-help');
    if (localGroup) localGroup.style.display = s.isLocal ? '' : 'none';
    if (workerGroup) workerGroup.style.display = s.isLocal ? 'none' : '';
    if (localButtons) localButtons.style.display = s.isLocal ? 'flex' : 'none';
    if (workerTest) workerTest.style.display = s.isLocal ? 'none' : '';
    if (help) help.style.display = s.isLocal ? '' : 'none';

    if (!s.isLocal) {
      const hasUrl = !!String(localStorage.getItem('finance_sign_url') || '').trim();
      let pass = '';
      try { pass = sessionStorage.getItem('akioFinance.remotePass') || ''; } catch (e) {}
      el.style.color = (hasUrl && pass) ? '#34d399' : '#fbbf24';
      el.textContent = (hasUrl && pass)
        ? 'Halaman publik siap menandatangani lewat Worker. Kata sandi kunci tersimpan untuk sesi browser ini — buat nota langsung dari sini.'
        : 'Halaman publik: kunci privat tidak ada di sini. Isi URL Worker dan kata sandi kunci di bawah, lalu buat nota. Tombol Buka kunci hanya untuk komputer toko.';
    } else if (s.stale) {
      el.style.color = '#f87171';
      el.textContent = 'Salinan kunci di browser sudah berbeda dengan file di komputer — kata sandinya bisa jadi berbeda. Klik ↺ Muat ulang dari file, lalu pakai kata sandi file terbaru.';
    } else if (!s.hasBox) {
      el.style.color = '#f87171';
      el.textContent = 'Berkas kunci tidak ditemukan di folder web/data/signing-key.enc.json pada komputer toko.';
    } else if (s.ready) {
      el.style.color = '#34d399';
      el.textContent = `Kunci terbuka dan siap dipakai · sidik ${s.fingerprint}`;
    } else {
      el.style.color = '#fbbf24';
      el.textContent = `Kunci tersimpan terenkripsi · sidik ${s.fingerprint} · masukkan kata sandi lalu klik Buka kunci.`;
    }
  } catch (e) {
    el.style.color = '#f87171';
    el.textContent = 'Gagal membaca status kunci: ' + e.message;
  }
}

async function handleFinanceKeyUnlock() {
  if (window.FinanceKey && typeof window.FinanceKey.isLocal === 'function' && !window.FinanceKey.isLocal()) {
    alert('Halaman publik tidak menyimpan kunci privat. Isi URL Worker dan kata sandi kunci di bawah, lalu buat nota langsung dari sini.');
    return;
  }
  const pass = (document.getElementById('finance-key-pass') || {}).value || '';
  try {
    await window.FinanceKey.unlock(pass);
    const input = document.getElementById('finance-key-pass');
    if (input) input.value = '';
    alert('✅ Kunci nota terbuka. Anda sudah bisa mencetak nota dengan QR yang valid.');
    updateFinanceKeyStatus();
  } catch (e) {
    alert('⚠️ Gagal membuka kunci: ' + e.message);
  }
}

async function handleFinanceKeyChangePassword() {
  const oldPass = prompt('Kata sandi kunci saat ini:');
  if (!oldPass) return;
  const newPass = prompt('Kata sandi baru (minimal 10 karakter):');
  if (!newPass) return;
  if (!confirm('Simpan kata sandi baru di tempat aman. Kata sandi lama tidak bisa dipakai lagi. Lanjutkan?')) return;
  try {
    await window.FinanceKey.changePassword(oldPass, newPass);
    const text = await window.FinanceKey.exportEncrypted();
    downloadFinanceKeyFile(text, 'akio-finance-signing-key-barul.json');
    alert('✅ Kata sandi kunci berhasil diganti. Berkas kunci baru sudah diunduh — timpa web/data/signing-key.enc.json dengan berkas tersebut agar kata sandi baru berlaku juga di komputer/flashdisk.');
    updateFinanceKeyStatus();
  } catch (e) {
    alert('⚠️ Gagal mengganti kata sandi: ' + e.message);
  }
}

function downloadFinanceKeyFile(text, filename) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function handleFinanceKeyExport() {
  try {
    const text = await window.FinanceKey.exportEncrypted();
    downloadFinanceKeyFile(text, 'akio-finance-signing-key-secure.json');
    alert('Kunci terenkripsi diunduh. Simpan di flashdisk, dan simpan kata sandinya di tempat terpisah.');
  } catch (e) {
    alert('⚠️ Gagal mengekspor kunci: ' + e.message);
  }
}

function handleSaveFinanceSignUrl() {
  const input = document.getElementById('finance-sign-url');
  if (!input) return;
  const url = String(input.value || '').trim();
  if (url) {
    localStorage.setItem('finance_sign_url', url);
    try { sessionStorage.removeItem('akioFinance.remotePass'); } catch (e) {}
    alert('URL Worker penandatanganan disimpan di perangkat ini.');
  } else {
    localStorage.removeItem('finance_sign_url');
    alert('URL Worker dihapus. Halaman publik tidak bisa menandatangani nota.');
  }
}

function handleSaveFinanceWorkerPass() {
  const input = document.getElementById('finance-worker-pass');
  if (!input) return;
  const pass = String(input.value || '');
  if (!pass) {
    try { sessionStorage.removeItem('akioFinance.remotePass'); } catch (e) {}
    alert('Kata sandi Worker dihapus dari sesi ini.');
  } else {
    try { sessionStorage.setItem('akioFinance.remotePass', pass); } catch (e) {}
    alert('Kata sandi kunci disimpan untuk sesi browser ini saja. Tutup browser untuk menghapusnya.');
  }
  input.value = '';
  updateFinanceKeyStatus();
}

async function handleTestFinanceSign() {
  const endpoint = String(localStorage.getItem('finance_sign_url') || '').trim();
  if (!endpoint) { alert('⚠️ Isi URL Worker dulu, lalu klik 💾 Simpan.'); return; }
  let pass = '';
  try { pass = sessionStorage.getItem('akioFinance.remotePass') || ''; } catch (e) {}
  if (!pass) { alert('⚠️ Isi kata sandi kunci untuk Worker, lalu klik 💾 Simpan sesi.'); return; }

  const tanggal = typeof getTodayLocal === 'function' ? getTodayLocal() : new Date().toISOString().split('T')[0];
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ no: 'UJI-WORKER', tanggal, nama: 'Uji Worker', total: 1, password: pass })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.signature) throw new Error(data.error || ('HTTP ' + res.status));
    alert('✅ Worker aktif dan kata sandi kunci benar. Sidik ' + data.k + '. Nota sekarang bisa dibuat.');
  } catch (e) {
    alert('⚠️ Worker gagal: ' + e.message + '\n\nCek URL Worker, lalu pastikan kata sandi yang dipakai adalah kata sandi terbaru dari web/data/signing-key.enc.json.');
  }
}

async function handleFinanceKeyReloadFromFile() {
  const ok = confirm('Hapus salinan kunci di browser lalu baca ulang web/data/signing-key.enc.json?\n\nKata sandi yang berlaku adalah kata sandi file di komputer ini. Setelah ini halaman akan dimuat ulang.');
  if (!ok) return;
  try {
    localStorage.removeItem('akioFinance.signing.v1');
    sessionStorage.removeItem('akioFinance.unlock');
    if (window.FinanceKey && typeof window.FinanceKey.lock === 'function') window.FinanceKey.lock();
  } catch (e) {}
  location.reload();
}

// Upload Handler Gambar Logo Toko
function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    uploadedLogoBase64 = evt.target.result;
    const box = document.getElementById('logo-preview-box');
    if (box) {
      box.innerHTML = `<img src="${uploadedLogoBase64}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
    }
  };
  reader.readAsDataURL(file);
}

function removeLogoImage() {
  uploadedLogoBase64 = '';
  const box = document.getElementById('logo-preview-box');
  if (box) box.innerHTML = '<span style="font-size:1.5rem;">🖼️</span>';
}

async function savePengaturanForm(e) {
  e.preventDefault();
  const form = e.target;
  const existingConfig = await db.pengaturan.get(1) || {};

  await db.pengaturan.put({
    id: 1,
    nama_toko: form.nama_toko.value,
    tagline: form.tagline.value,
    alamat: form.alamat.value,
    telepon: form.telepon.value,
    website_url: form.website_url.value,
    logo_path: uploadedLogoBase64,
    gdrive_client_id: existingConfig.gdrive_client_id || DEFAULT_GDRIVE_CLIENT_ID
  });

  alert('✅ Pengaturan profil toko berhasil disimpan!');
  if (typeof loadHeaderStoreProfile === 'function') loadHeaderStoreProfile();
  if (typeof pushRealtimeChange === 'function') pushRealtimeChange('full_sync');
}

// Handler Reset Database Transaksi Aman (dengan Auto-Backup)
async function handleResetDatabaseTransaksi() {
  const pesananCount = await db.pesanan.count();
  const keuanganCount = await db.keuangan.count();

  const confirmMsg = `⚠️ PERINGATAN KESELAMATAN!\n\n` +
    `Anda akan menghapus:\n` +
    `• ${pesananCount} Data Pesanan\n` +
    `• ${keuanganCount} Catatan Buku Kas Keuangan\n\n` +
    `Sistem akan secara OTOMATIS mengunduh file backup (.json) ke komputer/perangkat Anda terlebih dahulu agar data Anda selalu bisa dikembalikan.\n\n` +
    `Apakah Anda yakin ingin melanjutkan?`;

  if (!confirm(confirmMsg)) return;

  const typeConfirm = prompt(`Ketik kata "RESET" (huruf besar) untuk mengonfirmasi pengosongan database:`);
  if (typeConfirm !== 'RESET') {
    alert('Konfirmasi dibatalkan. Data Anda tetap aman dan tidak ada yang dihapus.');
    return;
  }

  try {
    await dbResetSemuaDataTransaksi();
    alert('✅ File backup otomatis telah diunduh dan seluruh data transaksi berhasil dikosongkan.');
    window.location.reload();
  } catch (err) {
    console.error('Gagal me-reset database:', err);
    alert(`⚠️ Terjadi kesalahan saat me-reset database: ${err.message}`);
  }
}

// Backup & Restore Lokal File .json
async function exportBackupJSONLokal() {
  const jsonStr = await dbExportFullBackupJSON();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `backup_papanbunga_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function importBackupJSONLokal(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      await dbImportFullBackupJSON(evt.target.result);
      alert('✅ Data dari file backup berhasil di-restore!');
      window.location.reload();
    } catch (err) {
      alert(`⚠️ Gagal me-restore data: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

// Handler simpan PIN Store Realtime
function handleSaveStorePin() {
  const pinInput = document.getElementById('input-store-pin');
  if (pinInput && pinInput.value) {
    if (typeof setStoreSyncPin === 'function') {
      setStoreSyncPin(pinInput.value);
    }
  }
}

function handleSaveCustomFirebaseUrl() {
  const urlInput = document.getElementById('input-firebase-url');
  if (urlInput) {
    const val = (urlInput.value || '').trim();
    if (val) {
      localStorage.setItem('custom_firebase_url', val);
      alert('✅ Firebase Database URL Custom berhasil disimpan! Aplikasi akan menghubungkan ke Realtime DB milik Anda.');
      if (typeof initFirebaseRealtimeSync === 'function') initFirebaseRealtimeSync();
    } else {
      localStorage.removeItem('custom_firebase_url');
      alert('ℹ️ Menggunakan default Firebase Realtime DB.');
      if (typeof initFirebaseRealtimeSync === 'function') initFirebaseRealtimeSync();
    }
  }
}


