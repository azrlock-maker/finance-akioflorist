// Google Drive Sync Manager (100% Mobile & Desktop OAuth Compatible)

const DEFAULT_GDRIVE_CLIENT_ID = '600872363732-nncu8pvq4b0lb6biorjfu96vqfh566ut.apps.googleusercontent.com';
const GDRIVE_FILE_NAME = 'finance_papanbunga_backup.json';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient = null;
let accessToken = localStorage.getItem('gdrive_access_token') || null;

// Status Indikator SINKRONISASI
const syncState = {
  isOnline: navigator.onLine,
  isLoggedIn: !!accessToken,
  lastSyncTime: localStorage.getItem('gdrive_last_sync') || null,
  syncing: false
};

// Periksa apakah URL memuat Hash Access Token setelah OAuth Redirect dari HP
function checkUrlAccessToken() {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      accessToken = token;
      localStorage.setItem('gdrive_access_token', token);
      syncState.isLoggedIn = true;
      updateSyncUI();
      // Bersihkan hash dari URL
      window.history.replaceState(null, null, window.location.pathname + window.location.search);
      // Otomatis download backup data dari Drive
      downloadDataFromDrive(true);
    }
  }
}

// Jalankan periksa Token URL saat script dimuat
checkUrlAccessToken();

// Event listener status koneksi jaringan (Online / Offline)
window.addEventListener('online', () => {
  syncState.isOnline = true;
  updateSyncUI();
  autoSyncBackgroundPull();
});

window.addEventListener('offline', () => {
  syncState.isOnline = false;
  updateSyncUI();
});

// Inisialisasi Client Google Identity Services (GIS)
function initGoogleDriveAuth(customClientId, callback) {
  if (typeof google === 'undefined' || !google.accounts) return;

  const activeClientId = customClientId || localStorage.getItem('gdrive_client_id') || DEFAULT_GDRIVE_CLIENT_ID;

  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: activeClientId,
      scope: SCOPES,
      callback: async (response) => {
        if (response.error) {
          console.error('Google Auth Error:', response);
          return;
        }
        accessToken = response.access_token;
        localStorage.setItem('gdrive_access_token', accessToken);
        syncState.isLoggedIn = true;
        updateSyncUI();
        if (callback) callback();
        // Otomatis tarik data terbaru saat login akun Google berhasil
        downloadDataFromDrive(true);
      },
    });
  } catch (err) {
    console.error('[GIS Init Error]', err);
  }
}

// Memicu Login Google (100% Kompatibel HP & Desktop via Direct OAuth Redirect jika Popup terblokir)
function loginGoogleDrive() {
  const activeClientId = localStorage.getItem('gdrive_client_id') || DEFAULT_GDRIVE_CLIENT_ID;

  // Coba via GIS Token Client
  if (tokenClient) {
    try {
      tokenClient.requestAccessToken({ prompt: 'consent' });
      return;
    } catch (e) {
      console.log('[GIS Popup Error/Blocked, falling back to direct OAuth redirect]', e);
    }
  }

  // Fallback 100% Sukses untuk Browser HP (Chrome Mobile, Safari iOS, dll) yang memblokir Popup:
  const redirectUri = window.location.origin + window.location.pathname;
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(activeClientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=token&` +
    `scope=${encodeURIComponent(SCOPES)}&` +
    `prompt=consent`;

  window.location.href = oauthUrl;
}

// Upload Data Local ke Google Drive (Dapat berjalan silent/otomatis)
async function uploadDataToDrive(silent = false) {
  if (!accessToken || !syncState.isOnline) {
    if (!silent) alert('Silakan klik "Hubungkan Akun Google" terlebih dahulu!');
    return false;
  }

  syncState.syncing = true;
  updateSyncUI();

  try {
    const jsonContent = await dbExportFullBackupJSON();
    const existingFileId = await findBackupFileId();

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (existingFileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
      method = 'PATCH';
    }

    const metadata = {
      name: GDRIVE_FILE_NAME,
      mimeType: 'application/json'
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', new Blob([jsonContent], { type: 'application/json' }));

    const res = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });

    if (res.status === 401) {
      localStorage.removeItem('gdrive_access_token');
      accessToken = null;
      syncState.isLoggedIn = false;
      if (!silent) alert('Sesi Google Drive telah berakhir. Silakan klik "Hubungkan Akun Google" kembali.');
      return false;
    }

    if (!res.ok) throw new Error(`Upload gagal dengan status ${res.status}`);

    const now = new Date().toLocaleString('id-ID');
    syncState.lastSyncTime = now;
    localStorage.setItem('gdrive_last_sync', now);
    if (!silent) alert(`✅ Data berhasil disinkronkan ke Google Drive pada ${now}`);
    return true;

  } catch (err) {
    console.error('Error Syncing to Drive:', err);
    if (!silent) alert(`⚠️ Gagal melakukan sinkronisasi: ${err.message}`);
    return false;
  } finally {
    syncState.syncing = false;
    updateSyncUI();
  }
}

// Download Data dari Google Drive ke Local (Dapat berjalan silent/otomatis)
async function downloadDataFromDrive(silent = false) {
  if (!accessToken || !syncState.isOnline) {
    if (!silent) alert('Silakan klik "Hubungkan Akun Google" terlebih dahulu!');
    return false;
  }

  syncState.syncing = true;
  updateSyncUI();

  try {
    const fileId = await findBackupFileId();
    if (!fileId) {
      if (!silent) alert('Belum ada file backup di Google Drive Anda. Lakukan Sync/Upload awal terlebih dahulu.');
      return false;
    }

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!res.ok) throw new Error('Gagal mengunduh file dari Drive');

    const jsonText = await res.text();
    await dbImportFullBackupJSON(jsonText);

    const now = new Date().toLocaleString('id-ID');
    syncState.lastSyncTime = now;
    localStorage.setItem('gdrive_last_sync', now);
    if (!silent) alert('✅ Data dari Google Drive berhasil diunduh dan dipulihkan ke perangkat ini!');
    
    // Refresh UI modules tanpa reload halaman penuh
    if (typeof refreshActiveViewModule === 'function') {
      refreshActiveViewModule();
    } else {
      window.location.reload();
    }
    return true;

  } catch (err) {
    console.error('Error Downloading from Drive:', err);
    if (!silent) alert(`⚠️ Gagal mengunduh data: ${err.message}`);
    return false;
  } finally {
    syncState.syncing = false;
    updateSyncUI();
  }
}

// Automatic Background Push & Pull Helpers
function autoSyncBackgroundPush() {
  if (accessToken && syncState.isOnline) {
    setTimeout(() => uploadDataToDrive(true), 500);
  }
}

function autoSyncBackgroundPull() {
  if (accessToken && syncState.isOnline) {
    setTimeout(() => downloadDataFromDrive(true), 800);
  }
}

// Cari ID file backup di Drive
async function findBackupFileId() {
  const query = encodeURIComponent(`name = '${GDRIVE_FILE_NAME}' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.files && data.files.length > 0) ? data.files[0].id : null;
}

// Update Tampilan Indikator Sync di Navigation
function updateSyncUI() {
  const badge = document.getElementById('sync-status-badge');
  const lastSyncText = document.getElementById('sync-last-time');

  if (!badge) return;

  if (!syncState.isOnline) {
    badge.className = 'sync-status-badge offline';
    badge.innerHTML = '⚡ OFFLINE';
  } else if (syncState.syncing) {
    badge.className = 'sync-status-badge online';
    badge.innerHTML = '🔄 SINKRONISASI...';
  } else if (accessToken) {
    badge.className = 'sync-status-badge online';
    badge.innerHTML = '☁️ AUTO-SYNC ACTIVE';
  } else {
    badge.className = 'sync-status-badge offline';
    badge.innerHTML = '🌐 ONLINE (Local)';
  }

  if (lastSyncText) {
    lastSyncText.innerText = syncState.lastSyncTime ? `Sync: ${syncState.lastSyncTime}` : 'Belum pernah sync';
  }
}
