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
              <input type="text" id="input-store-pin" class="form-control" style="font-weight:bold; letter-spacing:1px;" value="${localStorage.getItem('store_sync_pin') || 'AKIOFLORIST'}" placeholder="AKIOFLORIST">
              <button class="btn btn-primary" onclick="handleSaveStorePin()">🔗 Hubungkan</button>
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem;">
              💡 Masukkan PIN yang sama di HP & PC Anda agar data langsung sinkron secara otomatis.
            </div>
          </div>

          <!-- Accordion Toggle untuk Setting Firebase Custom (Opsional) -->
          <details style="margin-top:1rem; font-size:0.85rem; color:var(--text-muted); cursor:pointer;">
            <summary style="font-weight:600; color:var(--accent-primary);">⚙️ Custom Firebase Database URL (Opsional / Proyek Sendiri)</summary>
            <div class="form-group" style="margin-top:0.75rem; padding:0.75rem; background:rgba(0,0,0,0.2); border-radius:8px;">
              <input type="url" id="input-firebase-url" class="form-control" style="font-size:0.85rem;" 
                     value="${localStorage.getItem('custom_firebase_url') || ''}" 
                     placeholder="Contoh: https://proyek-anda-default-rtdb.asia-southeast1.firebasedatabase.app">
              <button class="btn btn-secondary btn-sm" style="margin-top:0.5rem;" onclick="handleSaveCustomFirebaseUrl()">💾 Simpan URL Firebase Custom</button>
            </div>
          </details>
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

        <!-- Card 3 (Tambahan Opsional): Google Drive Backup -->
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


