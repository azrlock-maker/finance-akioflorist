// Main Application Controller & Router (With Silent Auto Sync Router)

let currentView = 'dashboard';

document.addEventListener('DOMContentLoaded', async () => {
  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] Registered successfully:', reg.scope))
      .catch(err => console.log('[SW] Registration failed:', err));
  }

  // Init Google Drive Auth if client ID exists (read from localStorage or IndexedDB)
  let clientId = localStorage.getItem('gdrive_client_id');
  if (!clientId) {
    try {
      const config = await db.pengaturan.get(1);
      if (config && config.gdrive_client_id) {
        clientId = config.gdrive_client_id;
        localStorage.setItem('gdrive_client_id', clientId);
      }
    } catch (e) {}
  }

  if (clientId && typeof initGoogleDriveAuth === 'function') {
    initGoogleDriveAuth(clientId);
  }

  // Update UI status sync & auto-pull data dari Cloud/Drive
  if (typeof updateSyncUI === 'function') updateSyncUI();
  if (typeof autoSyncBackgroundPull === 'function') autoSyncBackgroundPull();

  // Inisialisasi Cloud Realtime Sync (Beda Wi-Fi OK, Realtime < 1s)
  if (typeof initFirebaseRealtimeSync === 'function') {
    initFirebaseRealtimeSync();
  }

  // Load Store Header Logo & Nama Toko
  loadHeaderStoreProfile();

  // Render initial view
  switchView('dashboard');
});

async function loadHeaderStoreProfile() {
  try {
    const config = await db.pengaturan.get(1);
    if (config) {
      if (config.nama_toko) {
        const titleEl = document.querySelector('.logo-text h1');
        if (titleEl) titleEl.innerText = config.nama_toko;
        document.title = `${config.nama_toko} (Finance Pro)`;
      }
      if (config.tagline) {
        const taglineEl = document.querySelector('.logo-text span');
        if (taglineEl) taglineEl.innerText = config.tagline;
      }
      if (config.logo_path) {
        const logoBox = document.querySelector('.logo-box');
        if (logoBox) {
          logoBox.style.background = 'transparent';
          logoBox.style.boxShadow = 'none';
          logoBox.innerHTML = `<img src="${config.logo_path}" style="width:100%; height:100%; object-fit:contain;">`;
        }
      }
    }
  } catch (e) {}
}

// Helper untuk memperbarui tampilan modul yang sedang aktif setelah sync otomatis
function refreshActiveViewModule() {
  switchView(currentView);
}

// View Switcher Router
async function switchView(viewName) {
  currentView = viewName;

  // Update nav UI active states
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));

  const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  const activeBottomNav = document.querySelector(`.bottom-nav-item[data-view="${viewName}"]`);

  if (activeNav) activeNav.classList.add('active');
  if (activeBottomNav) activeBottomNav.classList.add('active');

  // Hide all views
  document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));

  // Update title header
  const titleEl = document.getElementById('current-page-title');
  const titleMap = {
    'dashboard': 'Dashboard Utama',
    'pesanan': 'Pesanan Papan Bunga',
    'proses': 'Kanban Status Proses Papan',
    'keuangan': 'Keuangan Transaksi Kas',
    'hutang': 'Sisa Hutang & Piutang Pelanggan',
    'jadwal': 'Jadwal Antar Armada',
    'laporan': 'Laporan & Statistik',
    'pengaturan': 'Pengaturan Toko & Drive Sync'
  };
  if (titleEl) titleEl.innerText = titleMap[viewName] || 'Dashboard Utama';

  // Show target view & render module
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add('active');

    switch (viewName) {
      case 'dashboard':
        if (typeof renderDashboardModule === 'function') renderDashboardModule();
        break;
      case 'pesanan':
        if (typeof renderPesananModule === 'function') renderPesananModule();
        break;
      case 'proses':
        if (typeof renderProsesModule === 'function') renderProsesModule();
        break;
      case 'keuangan':
        if (typeof renderKeuanganModule === 'function') renderKeuanganModule();
        break;
      case 'hutang':
        if (typeof renderHutangModule === 'function') renderHutangModule();
        break;
      case 'jadwal':
        if (typeof renderJadwalModule === 'function') renderJadwalModule();
        break;
      case 'laporan':
        if (typeof renderLaporanModule === 'function') renderLaporanModule();
        break;
      case 'pengaturan':
        if (typeof renderPengaturanModule === 'function') renderPengaturanModule();
        break;
    }
  }

  // Close mobile sidebar drawer on click
  const sidebar = document.getElementById('sidebar');
  if (sidebar && sidebar.classList.contains('mobile-active')) {
    sidebar.classList.remove('mobile-active');
  }
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('mobile-active');
  }
}
