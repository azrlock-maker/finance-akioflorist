// Google Drive Sync Manager — Mobile & Desktop Persistent Auth
// Perbaikan: Token disimpan di IndexedDB (tahan mobile browser clear),
//            Silent re-auth otomatis dengan email hint saat token habis.

const DEFAULT_GDRIVE_CLIENT_ID = '600872363732-nncu8pvq4b0lb6biorjfu96vqfh566ut.apps.googleusercontent.com';
const GDRIVE_FILE_NAME = 'finance_papanbunga_backup.json';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// ─── Token Storage: IndexedDB (lebih tahan di HP vs localStorage) ───────────
// IndexedDB tidak dihapus browser saat memory rendah, tidak seperti localStorage.

const TOKEN_DB_NAME = 'GDriveAuthDB';
const TOKEN_STORE   = 'auth';

function openTokenDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TOKEN_DB_NAME, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(TOKEN_STORE, { keyPath: 'key' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e);
  });
}

async function tokenDbSet(key, value) {
  try {
    const db = await openTokenDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TOKEN_STORE, 'readwrite');
      tx.objectStore(TOKEN_STORE).put({ key, value });
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch(e) {
    // Fallback ke localStorage jika IndexedDB gagal
    localStorage.setItem('idb_' + key, value);
  }
}

async function tokenDbGet(key) {
  try {
    const db = await openTokenDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TOKEN_STORE, 'readonly');
      const req = tx.objectStore(TOKEN_STORE).get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = reject;
    });
  } catch(e) {
    return localStorage.getItem('idb_' + key);
  }
}

async function tokenDbRemove(key) {
  try {
    const db = await openTokenDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TOKEN_STORE, 'readwrite');
      tx.objectStore(TOKEN_STORE).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch(e) {
    localStorage.removeItem('idb_' + key);
  }
}

// ─── State ───────────────────────────────────────────────────────────────────

let tokenClient = null;
let accessToken  = null;
let silentReAuthTimer = null;

const syncState = {
  isOnline:     navigator.onLine,
  isLoggedIn:   false,
  lastSyncTime: localStorage.getItem('gdrive_last_sync') || null,
  syncing:      false
};

// ─── Load token dari IndexedDB saat pertama kali ─────────────────────────────

async function loadPersistedToken() {
  const token  = await tokenDbGet('access_token');
  const expiry = parseInt(await tokenDbGet('token_expiry') || '0');

  if (token && Date.now() < expiry) {
    accessToken          = token;
    syncState.isLoggedIn = true;
    scheduleSilentReAuth(expiry - Date.now());
    updateSyncUI();
    // Token masih valid → langsung pull data
    autoSyncBackgroundPull();
  } else if (token) {
    // Token ada tapi sudah habis → hapus, coba silent re-auth
    await tokenDbRemove('access_token');
    await tokenDbRemove('token_expiry');
    accessToken = null;
    trySilentReAuth();
  }
}

// ─── Cek Token URL setelah OAuth Redirect (fallback HP) ──────────────────────

function checkUrlAccessToken() {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=')) {
    const params    = new URLSearchParams(hash.substring(1));
    const token     = params.get('access_token');
    const expiresIn = parseInt(params.get('expires_in') || '3600');
    if (token) {
      saveToken(token, expiresIn);
      window.history.replaceState(null, null, window.location.pathname + window.location.search);
      downloadDataFromDrive(true);
    }
  }
}

async function saveToken(token, expiresIn = 3600) {
  const bufferSeconds = 300; // simpan 5 menit lebih pendek sebagai buffer
  const expiry        = Date.now() + (expiresIn - bufferSeconds) * 1000;

  accessToken          = token;
  syncState.isLoggedIn = true;

  await tokenDbSet('access_token',  token);
  await tokenDbSet('token_expiry',  String(expiry));
  // Backup ke localStorage juga untuk fallback
  localStorage.setItem('gdrive_access_token', token);
  localStorage.setItem('gdrive_token_expiry', String(expiry));

  updateSyncUI();
  scheduleSilentReAuth(expiry - Date.now());
}

// ─── Silent Re-Auth: Perbarui token otomatis sebelum habis ───────────────────

function scheduleSilentReAuth(msUntilExpiry) {
  if (silentReAuthTimer) clearTimeout(silentReAuthTimer);
  // Coba perbarui 2 menit sebelum token habis
  const delay = Math.max(msUntilExpiry - 2 * 60 * 1000, 5000);
  silentReAuthTimer = setTimeout(() => trySilentReAuth(), delay);
}

function trySilentReAuth() {
  if (!tokenClient) return;
  const hint = localStorage.getItem('gdrive_account_hint');
  try {
    // prompt: '' artinya coba tanpa interaksi apapun
    // login_hint: email akun → Google langsung pilih akun yang sama tanpa popup
    tokenClient.requestAccessToken({
      prompt:     '',
      login_hint: hint || undefined
    });
  } catch (e) {
    console.log('[GDrive] Silent re-auth gagal, perlu login manual.');
    syncState.isLoggedIn = false;
    updateSyncUI();
  }
}

// ─── Network Listeners ────────────────────────────────────────────────────────

window.addEventListener('online', () => {
  syncState.isOnline = true;
  updateSyncUI();
  autoSyncBackgroundPull();
});

window.addEventListener('offline', () => {
  syncState.isOnline = false;
  updateSyncUI();
});

// ─── Init Google Identity Services ───────────────────────────────────────────

function initGoogleDriveAuth(customClientId, callback) {
  if (typeof google === 'undefined' || !google.accounts) return;

  const activeClientId = customClientId || localStorage.getItem('gdrive_client_id') || DEFAULT_GDRIVE_CLIENT_ID;

  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: activeClientId,
      scope:     SCOPES,
      callback:  async (response) => {
        if (response.error) {
          console.error('Google Auth Error:', response);
          // Jika silent re-auth gagal (interaction_required), tidak perlu alert
          if (response.error === 'interaction_required' || response.error === 'access_denied') {
            syncState.isLoggedIn = false;
            updateSyncUI();
          }
          return;
        }

        // Simpan hint email untuk re-auth berikutnya
        if (response.email) {
          localStorage.setItem('gdrive_account_hint', response.email);
        }

        const expiresIn = response.expires_in || 3600;
        await saveToken(response.access_token, expiresIn);

        if (callback) callback();
        downloadDataFromDrive(true);
      },
    });

    // Setelah tokenClient siap, coba load token tersimpan
    loadPersistedToken();

  } catch (err) {
    console.error('[GIS Init Error]', err);
  }
}

// ─── Login Manual (dipanggil saat user klik tombol) ──────────────────────────

function loginGoogleDrive() {
  const activeClientId = localStorage.getItem('gdrive_client_id') || DEFAULT_GDRIVE_CLIENT_ID;
  const hint           = localStorage.getItem('gdrive_account_hint');

  if (tokenClient) {
    try {
      // Jika ada hint email → langsung pilih akun itu, tidak tampilkan daftar akun
      tokenClient.requestAccessToken({
        prompt:     hint ? '' : 'select_account',
        login_hint: hint || undefined
      });
      return;
    } catch (e) {
      console.log('[GIS Popup Error/Blocked, fallback ke direct OAuth redirect]', e);
    }
  }

  // Fallback redirect untuk browser HP yang blokir popup
  const redirectUri = window.location.origin + window.location.pathname;
  const loginHintParam = hint ? `&login_hint=${encodeURIComponent(hint)}` : '';
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(activeClientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=token&` +
    `scope=${encodeURIComponent(SCOPES)}&` +
    `prompt=${hint ? 'none' : 'select_account'}` +
    loginHintParam;

  window.location.href = oauthUrl;
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function logoutGoogleDrive() {
  if (silentReAuthTimer) clearTimeout(silentReAuthTimer);
  await tokenDbRemove('access_token');
  await tokenDbRemove('token_expiry');
  localStorage.removeItem('gdrive_access_token');
  localStorage.removeItem('gdrive_token_expiry');
  // Jangan hapus account_hint: agar re-login berikutnya tetap cepat
  accessToken          = null;
  syncState.isLoggedIn = false;
  updateSyncUI();
}

// ─── Upload ke Google Drive ───────────────────────────────────────────────────

async function uploadDataToDrive(silent = false) {
  if (!accessToken || !syncState.isOnline) {
    if (!silent) alert('Silakan klik "Hubungkan Akun Google" terlebih dahulu!');
    return false;
  }

  syncState.syncing = true;
  updateSyncUI();

  try {
    const jsonContent    = await dbExportFullBackupJSON();
    const existingFileId = await findBackupFileId();

    let url    = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';
    if (existingFileId) {
      url    = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
      method = 'PATCH';
    }

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify({ name: GDRIVE_FILE_NAME, mimeType: 'application/json' })], { type: 'application/json' }));
    formData.append('file',     new Blob([jsonContent], { type: 'application/json' }));

    const res = await fetch(url, { method, headers: { 'Authorization': `Bearer ${accessToken}` }, body: formData });

    if (res.status === 401) {
      // Token ditolak → coba silent re-auth dulu
      await tokenDbRemove('access_token');
      await tokenDbRemove('token_expiry');
      accessToken          = null;
      syncState.isLoggedIn = false;
      trySilentReAuth();
      if (!silent) alert('Sesi Google Drive telah berakhir. Sedang mencoba perbarui sesi...');
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

// ─── Download dari Google Drive ───────────────────────────────────────────────

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

// ─── Background Auto-Sync ─────────────────────────────────────────────────────

function autoSyncBackgroundPush() {
  if (typeof realtimeState !== 'undefined' && realtimeState.isConnected) return;
  if (accessToken && syncState.isOnline) {
    setTimeout(() => uploadDataToDrive(true), 500);
  }
}

function autoSyncBackgroundPull() {
  if (typeof realtimeState !== 'undefined' && realtimeState.isConnected) return;
  if (accessToken && syncState.isOnline) {
    setTimeout(() => downloadDataFromDrive(true), 800);
  }
}

// ─── Cari ID file backup di Drive ─────────────────────────────────────────────

async function findBackupFileId() {
  const query = encodeURIComponent(`name = '${GDRIVE_FILE_NAME}' and trashed = false`);
  const res   = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.files && data.files.length > 0) ? data.files[0].id : null;
}

// ─── Update UI Indikator Sync ──────────────────────────────────────────────────

function updateSyncUI() {
  // Jika Realtime Cloud Sync aktif, biarkan updateRealtimeUI yang mengatur tampilan badge
  if (typeof realtimeState !== 'undefined' && realtimeState.isConnected && typeof updateRealtimeUI === 'function') {
    updateRealtimeUI();
    return;
  }

  const badge       = document.getElementById('sync-status-badge');
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

// ─── Jalankan saat script dimuat ──────────────────────────────────────────────
checkUrlAccessToken();
