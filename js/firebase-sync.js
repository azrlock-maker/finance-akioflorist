// Firebase Realtime Cloud Synchronization Manager
// Memungkinkan PC dan HP sinkron instan (< 1 detik) dari mana saja (4G/5G / Beda Wi-Fi)
// Bebas dari login Google OAuth yang sering kadaluarsa.

const DEFAULT_STORE_PIN = 'AKIOFLORIST';

// Default Public Firebase Realtime DB Config (bebas kuota hingga 100 koneksi bersamaan)
const DEFAULT_FIREBASE_CONFIG = {
  databaseURL: "https://akio-florist-finance-default-rtdb.asia-southeast1.firebasedatabase.app"
};

let firebaseDb = null;
let currentStorePin = localStorage.getItem('store_sync_pin') || DEFAULT_STORE_PIN;
let isPullingFromCloud = false; // Flag khusus cegah infinite loop saat menerima update dari cloud

const realtimeState = {
  isOnline: navigator.onLine,
  isConnected: false,
  lastSyncTime: localStorage.getItem('realtime_last_sync') || null,
  lastError: null,
  syncing: false
};

// ─── Inisialisasi Firebase Realtime DB ───────────────────────────────────────

function initFirebaseRealtimeSync() {
  if (typeof firebase === 'undefined') {
    console.warn('[Realtime Sync] SDK Firebase belum dimuat.');
    realtimeState.lastError = 'SDK Firebase belum dimuat di browser.';
    updateRealtimeUI();
    return;
  }

  try {
    const customUrl = localStorage.getItem('custom_firebase_url');
    let config = customUrl ? { databaseURL: customUrl } : DEFAULT_FIREBASE_CONFIG;

    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    } else {
      const currentUrl = firebase.app().options.databaseURL;
      if (currentUrl !== config.databaseURL) {
        firebase.app().delete();
        firebase.initializeApp(config);
      }
    }
    firebaseDb = firebase.database();

    currentStorePin = localStorage.getItem('store_sync_pin') || DEFAULT_STORE_PIN;
    
    const connectedRef = firebaseDb.ref('.info/connected');
    connectedRef.on('value', (snap) => {
      realtimeState.isConnected = snap.val() === true;
      if (realtimeState.isConnected) {
        realtimeState.lastError = null;
        console.log(`[Realtime Sync] Connected to Cloud DB (${config.databaseURL}) (PIN: ${currentStorePin})`);
      }
      updateRealtimeUI();
    });

    attachRealtimeListeners();

  } catch (err) {
    console.error('[Realtime Sync Init Error]', err);
    realtimeState.lastError = err.message || 'Gagal inisialisasi Firebase';
    updateRealtimeUI();
  }
}

// ─── Event Listener Perubahan Data dari Cloud (Live Realtime) ───────────────

function attachRealtimeListeners() {
  if (!firebaseDb) return;

  const storeRef = firebaseDb.ref(`stores/${currentStorePin}`);

  // Dengarkan seluruh snapshot data toko secara live
  storeRef.on('value', async (snapshot) => {
    const cloudData = snapshot.val();
    realtimeState.lastError = null;
    if (!cloudData) return;

    // Jika sedang dalam proses pengiriman lokal, jangan timpang tindih
    if (isPullingFromCloud) return;

    try {
      isPullingFromCloud = true;
      let hasChanges = false;

      // 1. Update & Sync Pesanan Lokal dari Cloud
      if (cloudData.pesanan) {
        const cloudPesananList = Object.values(cloudData.pesanan);
        const cloudPesananIdSet = new Set(cloudPesananList.map(p => p.id));

        for (const p of cloudPesananList) {
          if (!p || !p.id) continue;
          const localP = await db.pesanan.get(p.id);
          if (!localP || JSON.stringify(localP) !== JSON.stringify(p)) {
            await db.pesanan.put(p);
            hasChanges = true;
          }
        }

        // Hapus pesanan di lokal jika sudah dihapus di cloud
        const allLocalPesanan = await db.pesanan.toArray();
        for (const lp of allLocalPesanan) {
          if (lp.id && !cloudPesananIdSet.has(lp.id)) {
            await db.pesanan.delete(lp.id);
            hasChanges = true;
          }
        }
      }

      // 2. Update & Sync Keuangan Kas Lokal dari Cloud
      if (cloudData.keuangan) {
        const cloudKeuanganList = Object.values(cloudData.keuangan);
        const cloudKeuanganIdSet = new Set(cloudKeuanganList.map(k => k.id));

        for (const k of cloudKeuanganList) {
          if (!k || !k.id) continue;
          const localK = await db.keuangan.get(k.id);
          if (!localK || JSON.stringify(localK) !== JSON.stringify(k)) {
            await db.keuangan.put(k);
            hasChanges = true;
          }
        }

        // Hapus keuangan di lokal jika sudah dihapus di cloud
        const allLocalKeuangan = await db.keuangan.toArray();
        for (const lk of allLocalKeuangan) {
          if (lk.id && !cloudKeuanganIdSet.has(lk.id)) {
            await db.keuangan.delete(lk.id);
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        realtimeState.lastSyncTime = now;
        localStorage.setItem('realtime_last_sync', now);
        updateRealtimeUI();

        // Refresh modul UI yang sedang dibuka user
        if (typeof refreshActiveViewModule === 'function') {
          refreshActiveViewModule();
        }
      }
    } catch (e) {
      console.error('[Realtime Sync Pull Error]', e);
    } finally {
      setTimeout(() => { isPullingFromCloud = false; }, 300);
    }
  }, (err) => {
    console.error('[Realtime Sync Listener Error]', err);
    realtimeState.lastError = err.message || 'Akses ditolak (Periksa Rules)';
    updateRealtimeUI();
  });
}

// ─── Broadcast Perubahan Data Lokal ke Cloud ───────────────────────────────

async function pushRealtimeChange(type, payload) {
  if (!firebaseDb || !realtimeState.isConnected || isPullingFromCloud) return;

  try {
    const storeRef = firebaseDb.ref(`stores/${currentStorePin}`);
    
    // Upload full database snapshot ke cloud untuk konsistensi sempurna
    const pesanan = await db.pesanan.toArray();
    const keuangan = await db.keuangan.toArray();
    const pesananMap = {};
    const keuanganMap = {};
    pesanan.forEach(p => { if (p.id) pesananMap[p.id] = p; });
    keuangan.forEach(k => { if (k.id) keuanganMap[k.id] = k; });

    await storeRef.set({
      pesanan: pesananMap,
      keuangan: keuanganMap,
      last_updated: Date.now()
    });

    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    realtimeState.lastSyncTime = now;
    realtimeState.lastError = null;
    localStorage.setItem('realtime_last_sync', now);
    updateRealtimeUI();
  } catch (err) {
    console.error('[Realtime Push Error]', err);
    realtimeState.lastError = err.message || 'Gagal mengirim data ke cloud';
    updateRealtimeUI();
  }
}

// ─── Ganti PIN Toko / Pasangkan HP dengan PC ─────────────────────────────────

async function setStoreSyncPin(newPin) {
  if (!newPin || !newPin.trim()) return;
  const cleanPin = newPin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleanPin.length < 6) {
    alert(`⚠️ PIN Toko minimal harus 6 karakter (karena aturan keamanan Firebase).\nPIN yang Anda masukkan: "${cleanPin}" (${cleanPin.length} karakter).`);
    return;
  }

  currentStorePin = cleanPin;
  localStorage.setItem('store_sync_pin', cleanPin);

  // Re-attach listener ke PIN toko yang baru
  if (firebaseDb) {
    firebaseDb.ref(`stores`).off();
    attachRealtimeListeners();
    // Lakukan full sync awal
    await pushRealtimeChange('full_sync');
  }

  updateRealtimeUI();
  alert(`✅ PIN Sync Toko berhasil diubah menjadi: ${cleanPin}\nPastikan HP & PC Anda menggunakan PIN yang sama!`);
}

// ─── Tes Koneksi & Paksa Sinkronisasi Sekarang ──────────────────────────────

async function triggerManualRealtimeSync() {
  if (!navigator.onLine) {
    alert('⚠️ Perangkat sedang OFFLINE. Pastikan koneksi internet aktif.');
    return;
  }

  try {
    initFirebaseRealtimeSync();
    if (!firebaseDb) {
      alert('⚠️ Gagal inisialisasi Firebase.');
      return;
    }

    const storeRef = firebaseDb.ref(`stores/${currentStorePin}`);
    
    // Tes baca data
    const snapshot = await storeRef.once('value');
    const cloudData = snapshot.val();

    let cloudPesananCount = 0;
    let cloudKasCount = 0;
    if (cloudData) {
      if (cloudData.pesanan) cloudPesananCount = Object.keys(cloudData.pesanan).length;
      if (cloudData.keuangan) cloudKasCount = Object.keys(cloudData.keuangan).length;
    }

    // Push data lokal ke cloud juga untuk sinkronisasi 2 arah
    await pushRealtimeChange('manual_test');

    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    realtimeState.lastSyncTime = now;
    realtimeState.lastError = null;
    localStorage.setItem('realtime_last_sync', now);
    updateRealtimeUI();

    alert(`✅ KONEKSI REALTIME CLOUD BERHASIL!\n\n` +
          `• Database: Aktif & Terhubung\n` +
          `• PIN Toko: ${currentStorePin}\n` +
          `• Data di Cloud: ${cloudPesananCount} Pesanan, ${cloudKasCount} Transaksi Kas\n` +
          `• Status: Siap sinkron otomatis antara PC & HP.`);
  } catch (err) {
    console.error('[Manual Sync Error]', err);
    realtimeState.lastError = err.message;
    updateRealtimeUI();
    alert(`⚠️ GAGAL TERHUBUNG KE CLOUD:\n${err.message}\n\nPeriksa apakah URL Firebase dan PIN Toko (min 6 karakter) sudah benar.`);
  }
}

// ─── Update UI Indikator Realtime ────────────────────────────────────────────

function updateRealtimeUI() {
  const badge = document.getElementById('sync-status-badge');
  const lastSyncText = document.getElementById('sync-last-time');

  if (!badge) return;

  if (!navigator.onLine) {
    badge.className = 'sync-status-badge offline';
    badge.innerHTML = '⚡ OFFLINE';
  } else if (realtimeState.isConnected) {
    badge.className = 'sync-status-badge online';
    badge.innerHTML = `📡 REALTIME (${currentStorePin})`;
  } else if (realtimeState.lastError) {
    badge.className = 'sync-status-badge offline';
    badge.innerHTML = '⚠️ ERROR CLOUD';
    badge.title = realtimeState.lastError;
  } else {
    badge.className = 'sync-status-badge offline';
    badge.innerHTML = '🔄 HUBUNGKAN CLOUD...';
  }

  if (lastSyncText) {
    if (realtimeState.lastError) {
      lastSyncText.innerText = `Err: ${realtimeState.lastError.substring(0, 20)}`;
    } else {
      lastSyncText.innerText = realtimeState.lastSyncTime ? `Live: ${realtimeState.lastSyncTime}` : `PIN: ${currentStorePin}`;
    }
  }
}

// Network events
window.addEventListener('online', () => { updateRealtimeUI(); });
window.addEventListener('offline', () => { updateRealtimeUI(); });
