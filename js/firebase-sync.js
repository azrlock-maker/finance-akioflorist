// Firebase Realtime Cloud Synchronization Manager
// Memungkinkan PC dan HP sinkron instan (< 1 detik) dari mana saja (4G/5G / Beda Wi-Fi)
// Bebas dari login Google OAuth yang sering kadaluarsa.

const DEFAULT_STORE_PIN = 'AKIOFLORIST';

// Default Public Firebase Realtime DB Config (bebas kuota hingga 100 koneksi bersamaan)
const DEFAULT_FIREBASE_CONFIG = {
  databaseURL: "https://finance-papanbunga-default-rtdb.asia-southeast1.firebasedatabase.app"
};

let firebaseDb = null;
let currentStorePin = localStorage.getItem('store_sync_pin') || DEFAULT_STORE_PIN;
let isRemoteUpdate = false; // Flag untuk cegah infinite loop sync

const realtimeState = {
  isOnline: navigator.onLine,
  isConnected: false,
  lastSyncTime: localStorage.getItem('realtime_last_sync') || null,
  syncing: false
};

// ─── Inisialisasi Firebase Realtime DB ───────────────────────────────────────

function initFirebaseRealtimeSync() {
  if (typeof firebase === 'undefined') {
    console.warn('[Realtime Sync] SDK Firebase belum dimuat.');
    updateRealtimeUI();
    return;
  }

  try {
    const customUrl = localStorage.getItem('custom_firebase_url');
    let config = customUrl ? { databaseURL: customUrl } : DEFAULT_FIREBASE_CONFIG;

    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    } else if (customUrl && firebase.app().options.databaseURL !== customUrl) {
      // Re-initialize if URL changed
      firebase.app().delete();
      firebase.initializeApp(config);
    }
    firebaseDb = firebase.database();

    // Dapatkan PIN Toko yang tersimpan
    currentStorePin = localStorage.getItem('store_sync_pin') || DEFAULT_STORE_PIN;
    
    // Monitor status koneksi Firebase secara instan
    const connectedRef = firebaseDb.ref('.info/connected');
    connectedRef.on('value', (snap) => {
      realtimeState.isConnected = snap.val() === true;
      updateRealtimeUI();
      if (realtimeState.isConnected) {
        console.log(`[Realtime Sync] Connected to Cloud DB (PIN: ${currentStorePin})`);
      }
    });

    // Mulai dengarkan perubahan data realtime dari Cloud
    attachRealtimeListeners();

  } catch (err) {
    console.error('[Realtime Sync Init Error]', err);
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
    if (!cloudData) return;

    // Jika perubahan dipicu oleh perangkat ini sendiri, abaikan
    if (isRemoteUpdate) return;

    try {
      isRemoteUpdate = true;
      let hasChanges = false;

      // Update Pesanan Lokal dari Cloud
      if (cloudData.pesanan) {
        const cloudPesananList = Object.values(cloudData.pesanan);
        for (const p of cloudPesananList) {
          if (!p || !p.id) continue;
          const localP = await db.pesanan.get(p.id);
          if (!localP || JSON.stringify(localP) !== JSON.stringify(p)) {
            await db.pesanan.put(p);
            hasChanges = true;
          }
        }
      }

      // Update Keuangan Lokal dari Cloud
      if (cloudData.keuangan) {
        const cloudKeuanganList = Object.values(cloudData.keuangan);
        for (const k of cloudKeuanganList) {
          if (!k || !k.id) continue;
          const localK = await db.keuangan.get(k.id);
          if (!localK || JSON.stringify(localK) !== JSON.stringify(k)) {
            await db.keuangan.put(k);
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
      setTimeout(() => { isRemoteUpdate = false; }, 300);
    }
  });
}

// ─── Broadcast Perubahan Data Lokal ke Cloud ───────────────────────────────

async function pushRealtimeChange(type, payload) {
  if (!firebaseDb || !realtimeState.isConnected || isRemoteUpdate) return;

  try {
    const storeRef = firebaseDb.ref(`stores/${currentStorePin}`);
    if (type === 'pesanan' && payload && payload.id) {
      await storeRef.child(`pesanan/${payload.id}`).set(payload);
    } else if (type === 'keuangan' && payload && payload.id) {
      await storeRef.child(`keuangan/${payload.id}`).set(payload);
    } else if (type === 'full_sync') {
      // Upload full database snapshot ke cloud
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
    }

    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    realtimeState.lastSyncTime = now;
    localStorage.setItem('realtime_last_sync', now);
    updateRealtimeUI();
  } catch (err) {
    console.error('[Realtime Push Error]', err);
  }
}

// ─── Ganti PIN Toko / Pasangkan HP dengan PC ─────────────────────────────────

async function setStoreSyncPin(newPin) {
  if (!newPin || !newPin.trim()) return;
  const cleanPin = newPin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
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
  } else {
    badge.className = 'sync-status-badge offline';
    badge.innerHTML = '🔄 HUBUNGKAN CLOUD...';
  }

  if (lastSyncText) {
    lastSyncText.innerText = realtimeState.lastSyncTime ? `Live: ${realtimeState.lastSyncTime}` : `PIN: ${currentStorePin}`;
  }
}

// Network events
window.addEventListener('online', () => { updateRealtimeUI(); });
window.addEventListener('offline', () => { updateRealtimeUI(); });
