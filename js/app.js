// Main Application Controller & Router

let currentView = 'dashboard';

document.addEventListener('DOMContentLoaded', async () => {
  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] Registered successfully:', reg.scope))
      .catch(err => console.log('[SW] Registration failed:', err));
  }

  // Init Google Drive Auth if client ID exists
  const clientId = localStorage.getItem('gdrive_client_id');
  if (clientId && typeof initGoogleDriveAuth === 'function') {
    initGoogleDriveAuth(clientId);
  }

  // Update UI status sync
  if (typeof updateSyncUI === 'function') updateSyncUI();

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
          logoBox.innerHTML = `<img src="${config.logo_path}" style="width:100%; height:100%; object-fit:contain; border-radius:8px;">`;
        }
      }
    }
  } catch (e) {}
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

  // Show target view
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');

  // Set Header Title
  const titles = {
    dashboard: 'Dashboard Utama',
    pesanan: 'Kelola Pesanan Papan',
    proses: 'Status Produksi Papan',
    keuangan: 'Keuangan Kas Operasional',
    hutang: 'Sisa Hutang Pelanggan',
    jadwal: 'Jadwal Pengantaran Armada',
    laporan: 'Laporan & Rekap Statistik',
    pengaturan: 'Pengaturan & Sync'
  };
  const titleEl = document.getElementById('current-page-title');
  if (titleEl) titleEl.innerText = titles[viewName] || 'Finance Papan Bunga';

  // Close mobile sidebar if open
  closeMobileSidebar();

  // Render corresponding module content
  switch (viewName) {
    case 'dashboard':
      if (typeof renderDashboardModule === 'function') await renderDashboardModule();
      break;
    case 'pesanan':
      if (typeof renderPesananModule === 'function') await renderPesananModule();
      break;
    case 'proses':
      if (typeof renderProsesModule === 'function') await renderProsesModule();
      break;
    case 'keuangan':
      if (typeof renderKeuanganModule === 'function') await renderKeuanganModule();
      break;
    case 'hutang':
      if (typeof renderHutangModule === 'function') await renderHutangModule();
      break;
    case 'jadwal':
      if (typeof renderJadwalModule === 'function') await renderJadwalModule();
      break;
    case 'laporan':
      if (typeof renderLaporanModule === 'function') await renderLaporanModule();
      break;
    case 'pengaturan':
      if (typeof renderPengaturanModule === 'function') await renderPengaturanModule();
      break;
  }
}

// Mobile Sidebar Toggle
function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
}
