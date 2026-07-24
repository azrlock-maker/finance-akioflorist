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
    logo_path: ''
  };

  uploadedLogoBase64 = config.logo_path || '';

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
              <div id="logo-preview-box" style="width:70px; height:70px; border:2px dashed var(--border-color); border-radius:10px; display:flex; align-items:center; justify-content:center; overflow:hidden; background:rgba(0,0,0,0.2);">
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
              💡 <b>Fungsi:</b> URL ini akan otomatis dimasukkan ke dalam QR Code Nota. Saat pelanggan men-scan QR Code dengan HP, browser akan membuka link ini untuk memverifikasi tanda tangan digital (<code>SIGN</code>) & keaslian nota secara otomatis.
            </p>
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1rem;">💾 Simpan Pengaturan Toko & Logo</button>
        </form>
      </div>

      <!-- Card Google Drive Sync -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">☁️ Integrasi Google Drive Sync</div>
        </div>

        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">
          Hubungkan akun Google Drive Anda untuk mensinkronkan data secara otomatis antara HP dan PC tanpa server.
        </p>

        <div class="form-group">
          <label class="form-label">Google OAuth Client ID</label>
          <input type="text" id="gdrive_client_id_input" class="form-control" 
                 placeholder="Contoh: 123456789-abc.apps.googleusercontent.com"
                 value="${localStorage.getItem('gdrive_client_id') || ''}">
        </div>
        <button class="btn btn-secondary btn-sm" style="margin-bottom:1.5rem;" onclick="saveGDriveClientId()">Simpan Client ID</button>

        <div style="display:flex; flex-direction:column; gap:0.75rem;">
          <button class="btn btn-secondary" onclick="loginGoogleDrive()">🔑 Hubungkan Akun Google Drive</button>
          <button class="btn btn-success" onclick="uploadDataToDrive()">📤 Upload / Sync ke Google Drive</button>
          <button class="btn btn-warning" onclick="downloadDataFromDrive()">📥 Download / Restore dari Google Drive</button>
        </div>

        <hr style="border-color:var(--border-color); margin:1.5rem 0;">

        <div class="card-title" style="font-size:0.95rem; margin-bottom:0.75rem;">💾 Backup / Restore Lokal File</div>
        <div style="display:flex; gap:0.75rem;">
          <button class="btn btn-secondary btn-sm" onclick="exportBackupJSONLokal()">Download File Backup (.json)</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('file-restore-input').click()">Restore File (.json)</button>
          <input type="file" id="file-restore-input" style="display:none;" accept=".json" onchange="importBackupJSONLokal(event)">
        </div>
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

  await db.pengaturan.put({
    id: 1,
    nama_toko: form.nama_toko.value,
    tagline: form.tagline.value,
    alamat: form.alamat.value,
    telepon: form.telepon.value,
    website_url: form.website_url.value,
    logo_path: uploadedLogoBase64
  });

  alert('✅ Pengaturan toko, logo, dan link verifikasi berhasil disimpan!');

  if (typeof loadHeaderStoreProfile === 'function') {
    loadHeaderStoreProfile();
  }

  renderPengaturanModule();
}

function saveGDriveClientId() {
  const val = document.getElementById('gdrive_client_id_input').value.trim();
  localStorage.setItem('gdrive_client_id', val);
  if (val && typeof initGoogleDriveAuth === 'function') {
    initGoogleDriveAuth(val);
  }
  alert('Client ID berhasil disimpan!');
}

async function exportBackupJSONLokal() {
  const jsonStr = await dbExportFullBackupJSON();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `backup_finance_papanbunga_${new Date().toISOString().split('T')[0]}.json`);
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
      alert('✅ Data berhasil dipulihkan dari file backup!');
      window.location.reload();
    } catch (err) {
      alert(`⚠️ Gagal restore: ${err.message}`);
    }
  };
  reader.readAsText(file);
}
