// Pesanan Module with Digital HMAC Barcode/QR Code Verification, Monthly Grouping & Logo Support

let pesananSearchKeyword = '';
let selectedPesananBulan = 'ALL';

function getPesananNamaBulanTahun(ym) {
  if (!ym || !ym.includes('-')) return ym || 'Tanpa Tanggal';
  const parts = ym.split('-');
  const y = parts[0];
  const m = parseInt(parts[1], 10);
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${monthNames[m - 1] || m} ${y}`;
}

function onFilterPesananBulan(val) {
  selectedPesananBulan = val;
  renderPesananModule(false);
}

// Helper WA and URLs are loaded globally from js/db.js

function getPesananTableRowsHtml(groupedByMonth, sortedMonths, formatRp) {
  if (sortedMonths.length === 0) {
    return `<tr><td colspan="8" style="text-align:center; padding:2.5rem; color:var(--text-muted);">Tidak ada data pesanan ditemukan.</td></tr>`;
  }

  return sortedMonths.map(ym => {
    const list = groupedByMonth[ym];
    let totalBulan = 0;
    let sisaBulan = 0;
    list.forEach(p => {
      const h = p.harga || 0;
      const d = p.dibayar || 0;
      totalBulan += h;
      if (d < h) sisaBulan += (h - d);
    });

    const headerHtml = `
      <tr class="table-month-header-row">
        <td colspan="8" style="background:rgba(59, 130, 246, 0.12); border-top:2px solid var(--accent-primary); padding:0.65rem 1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-weight:700;">
            <span style="color:var(--text-main); font-size:0.95rem;">📅 ${getPesananNamaBulanTahun(ym)} (${list.length} Pesanan)</span>
            <span style="font-size:0.85rem; color:var(--text-muted);">
              Total: <b style="color:var(--text-main);">${formatRp(totalBulan)}</b> | 
              Sisa Piutang: <b style="color:${sisaBulan > 0 ? 'var(--danger)' : 'var(--success)'};">${formatRp(sisaBulan)}</b>
            </span>
          </div>
        </td>
      </tr>
    `;

    const rowsHtml = list.map(p => {
      const safeNama = typeof escapeAttr === 'function' ? escapeAttr(p.nama_pemesan) : (p.nama_pemesan || '').replace(/'/g, "\\'");
      const safeWa = typeof escapeAttr === 'function' ? escapeAttr(p.no_wa) : (p.no_wa || '').replace(/'/g, "\\'");
      const safeNota = typeof escapeAttr === 'function' ? escapeAttr(p.no_nota) : (p.no_nota || '').replace(/'/g, "\\'");
      const displayNama = typeof escapeHtml === 'function' ? escapeHtml(p.nama_pemesan || '-') : (p.nama_pemesan || '-');
      const displayJenis = typeof escapeHtml === 'function' ? escapeHtml(p.jenis_papan || '-') : (p.jenis_papan || '-');
      const displayUcapan = typeof escapeHtml === 'function' ? escapeHtml(p.ucapan || '-') : (p.ucapan || '-');
      const displayLokasi = typeof escapeHtml === 'function' ? escapeHtml(p.lokasi_pengantaran || '-') : (p.lokasi_pengantaran || '-');
      const displayNota = typeof escapeHtml === 'function' ? escapeHtml(p.no_nota || '-') : (p.no_nota || '-');

      return `
        <tr>
          <td><b>${displayNota}</b></td>
          <td>
            <small>Pesan: ${p.tanggal || '-'}</small><br>
            <small style="color:var(--info);">Antar: ${p.tanggal_antar || '-'}</small>
          </td>
          <td>
            <div style="cursor:pointer; display:inline-flex; align-items:center; gap:0.25rem;" 
                 title="Klik untuk chat WhatsApp pemesan (Rincian Pesanan)"
                 onclick="handleWaPesananClick(event, ${p.id})">
              <b style="color:var(--text-main); font-size:0.95rem;">${displayNama}</b>
              <span style="color:#25D366; font-size:0.95rem;">💬</span>
            </div><br>
            ${p.no_wa ? `
              <small style="color:#25D366; font-weight:600; cursor:pointer;" 
                     onclick="handleWaPesananClick(event, ${p.id})"
                     title="Klik untuk chat WhatsApp">
                📱 ${typeof escapeHtml === 'function' ? escapeHtml(p.no_wa) : p.no_wa}
              </small><br>
            ` : `
              <small style="color:var(--text-muted); cursor:pointer; font-style:italic;" onclick="openPesananModal(${p.id})">
                📱 <span style="text-decoration:underline;">+ Tambah WA</span>
              </small><br>
            `}
            <small style="color:var(--text-muted);">
              📍 ${displayLokasi}
              ${typeof getGmapsBadgeHtml === 'function' ? getGmapsBadgeHtml(p) : ''}
            </small>
          </td>
          <td>
            <span class="badge badge-proses">${displayJenis}</span><br>
            <small style="color:var(--text-muted); font-style:italic;">"${displayUcapan}"</small>
          </td>
          <td>
            <b>Total: ${formatRp(p.harga)}</b><br>
            <small style="color:var(--success);">Dibayar: ${formatRp(p.dibayar)}</small>
          </td>
          <td>
            ${p.status_lunas ? '<span class="badge badge-lunas">LUNAS</span>' : `
              <span class="badge badge-belum">SISA ${formatRp(p.harga - p.dibayar)}</span>
            `}
          </td>
          <td><span class="badge badge-siap">${p.status_proses || 'Data Masuk'}</span></td>
          <td style="text-align:right;">
            <div style="display:inline-flex; gap:0.35rem; flex-wrap:wrap; justify-content:flex-end;">
              ${!p.status_lunas ? `<button class="btn btn-success btn-sm" title="Tandai Lunas" onclick="handleTandaiLunas(${p.id})">✔ Lunas</button>` : ''}
              <button class="btn btn-secondary btn-sm" title="Cetak Nota Resmi A4 & QR Code" onclick="printNotaPesanan(${p.id})">🖨️ A4</button>
              <button class="btn btn-secondary btn-sm" title="Cetak Struk Thermal (58mm / 80mm)" onclick="printThermalNotaPesanan(${p.id})">🧾 Struk</button>
              <button class="btn btn-secondary btn-sm" title="Edit" onclick="openPesananModal(${p.id})">✏️</button>
              <button class="btn btn-danger btn-sm" title="Hapus" onclick="handleHapusPesanan(${p.id})">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return headerHtml + rowsHtml;
  }).join('');
}

function getPesananMobileCardsHtml(groupedByMonth, sortedMonths, formatRp) {
  if (sortedMonths.length === 0) {
    return `<div style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted);">Tidak ada data pesanan ditemukan.</div>`;
  }

  return sortedMonths.map(ym => {
    const list = groupedByMonth[ym];
    let totalBulan = 0;
    let sisaBulan = 0;
    list.forEach(p => {
      const h = p.harga || 0;
      const d = p.dibayar || 0;
      totalBulan += h;
      if (d < h) sisaBulan += (h - d);
    });

    return `
      <div class="pesanan-month-group">
        <div class="pesanan-month-header">
          <div class="pesanan-month-title">
            <span style="font-size:1.1rem;">📅</span>
            <span style="font-weight:700; color:var(--text-main);">${getPesananNamaBulanTahun(ym)}</span>
            <span class="badge badge-proses" style="font-size:0.75rem;">${list.length} Pesanan</span>
          </div>
          <div class="pesanan-month-meta">
            <span>Total: <b>${formatRp(totalBulan)}</b></span>
            ${sisaBulan > 0 ? `<span class="badge badge-belum" style="font-size:0.75rem;">Sisa: ${formatRp(sisaBulan)}</span>` : `<span class="badge badge-lunas" style="font-size:0.75rem;">Semua Lunas</span>`}
          </div>
        </div>

        <div class="pesanan-month-cards-list">
          ${list.map(p => {
            const safeNama = typeof escapeAttr === 'function' ? escapeAttr(p.nama_pemesan) : (p.nama_pemesan || '').replace(/'/g, "\\'");
            const safeWa = typeof escapeAttr === 'function' ? escapeAttr(p.no_wa) : (p.no_wa || '').replace(/'/g, "\\'");
            const safeNota = typeof escapeAttr === 'function' ? escapeAttr(p.no_nota) : (p.no_nota || '').replace(/'/g, "\\'");
            const displayNama = typeof escapeHtml === 'function' ? escapeHtml(p.nama_pemesan || '-') : (p.nama_pemesan || '-');
            const displayJenis = typeof escapeHtml === 'function' ? escapeHtml(p.jenis_papan || '-') : (p.jenis_papan || '-');
            const displayUcapan = typeof escapeHtml === 'function' ? escapeHtml(p.ucapan || '-') : (p.ucapan || '-');
            const displayLokasi = typeof escapeHtml === 'function' ? escapeHtml(p.lokasi_pengantaran || '-') : (p.lokasi_pengantaran || '-');
            const displayNota = typeof escapeHtml === 'function' ? escapeHtml(p.no_nota || '-') : (p.no_nota || '-');

            return `
              <div class="mobile-card-item">
                <div class="mobile-card-header">
                  <span class="nota-no">📄 ${displayNota}</span>
                  ${p.status_lunas ? '<span class="badge badge-lunas">LUNAS</span>' : `<span class="badge badge-belum">SISA ${formatRp(p.harga - p.dibayar)}</span>`}
                </div>
                <div class="mobile-card-body">
                  <div class="customer-name" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.35rem;" 
                       onclick="handleWaPesananClick(event, ${p.id})">
                    <span>${displayNama}</span>
                    <span style="color:#25D366; font-size:1.05rem;">💬</span>
                  </div>
                  ${p.no_wa ? `
                    <div style="font-size:0.82rem; color:#25D366; font-weight:600; cursor:pointer; margin-top:0.15rem;" 
                         onclick="handleWaPesananClick(event, ${p.id})">
                      📱 ${typeof escapeHtml === 'function' ? escapeHtml(p.no_wa) : p.no_wa} (Chat WA)
                    </div>
                  ` : `
                    <div style="font-size:0.78rem; color:var(--text-muted); cursor:pointer; margin-top:0.15rem; font-style:italic;" 
                         onclick="openPesananModal(${p.id})">
                      📱 <span style="text-decoration:underline;">+ Tambah WA Pemesan</span>
                    </div>
                  `}
                  <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem; display:flex; justify-content:space-between; align-items:center;">
                    <span>📍 ${displayLokasi}</span>
                    ${typeof getGmapsBadgeHtml === 'function' ? getGmapsBadgeHtml(p, true) : ''}
                  </div>
                  <div style="margin-top:0.25rem; display:flex; gap:0.4rem; flex-wrap:wrap;">
                    <span class="badge badge-proses">${displayJenis}</span>
                    <span class="badge badge-siap">${p.status_proses || 'Data Masuk'}</span>
                  </div>
                  <div class="ucapan-quote">"${displayUcapan}"</div>
                </div>
                <div class="mobile-card-meta">
                  <div>📅 Antar: <b>${p.tanggal_antar || '-'}</b></div>
                  <div>💰 Total: <b>${formatRp(p.harga)}</b></div>
                </div>
                <div class="mobile-card-actions">
                  ${!p.status_lunas ? `<button class="btn btn-success" onclick="handleTandaiLunas(${p.id})">✔ Lunas</button>` : ''}
                  <button class="btn btn-secondary" onclick="openPesananModal(${p.id})">✏️ Edit</button>
                  <button class="btn btn-secondary" onclick="printNotaPesanan(${p.id})">📄 A4</button>
                  <button class="btn btn-secondary" onclick="printThermalNotaPesanan(${p.id})">🧾 Struk</button>
                  <button class="btn btn-danger" style="flex:0.35; min-width:44px;" title="Hapus Pesanan" onclick="handleHapusPesanan(${p.id})">🗑️</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

async function renderPesananModule(forceFullRender = false) {
  const container = document.getElementById('view-pesanan');
  if (!container) return;

  const allPesanan = await db.pesanan.toArray();

  // Urutkan pesanan dari yang PALING TERBARU (tanggal pesan/antar terbaru, kemudian ID terbesar)
  allPesanan.sort((a, b) => {
    const tglA = String(a.tanggal || a.tanggal_antar || '');
    const tglB = String(b.tanggal || b.tanggal_antar || '');
    if (tglA !== tglB) return tglB.localeCompare(tglA);
    return (b.id || 0) - (a.id || 0);
  });

  // Ambil daftar unik bulan (YYYY-MM) dari data pesanan
  const monthKeysSet = new Set();
  allPesanan.forEach(p => {
    const tgl = p.tanggal || p.tanggal_antar || '';
    if (tgl && tgl.length >= 7) {
      monthKeysSet.add(tgl.substring(0, 7));
    }
  });
  const availableMonths = Array.from(monthKeysSet).sort((a, b) => b.localeCompare(a));

  // Filter berdasarkan bulan & kata kunci pencarian
  const filtered = allPesanan.filter(p => {
    if (selectedPesananBulan !== 'ALL') {
      const tgl = p.tanggal || p.tanggal_antar || '';
      if (!tgl.startsWith(selectedPesananBulan)) return false;
    }
    if (!pesananSearchKeyword) return true;
    const kw = pesananSearchKeyword.toLowerCase();
    return (p.nama_pemesan && p.nama_pemesan.toLowerCase().includes(kw)) ||
      (p.no_wa && p.no_wa.toLowerCase().includes(kw)) ||
      (p.no_nota && p.no_nota.toLowerCase().includes(kw)) ||
      (p.jenis_papan && p.jenis_papan.toLowerCase().includes(kw));
  });

  // Pengelompokan pesanan berdasarkan Bulan (YYYY-MM)
  const groupedByMonth = {};
  filtered.forEach(p => {
    const tgl = p.tanggal || p.tanggal_antar || '';
    const ym = (tgl && tgl.length >= 7) ? tgl.substring(0, 7) : 'Lainnya';
    if (!groupedByMonth[ym]) groupedByMonth[ym] = [];
    groupedByMonth[ym].push(p);
  });

  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => {
    if (a === 'Lainnya') return 1;
    if (b === 'Lainnya') return -1;
    return b.localeCompare(a);
  });

  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

  const tbody = document.getElementById('pesanan-tbody');
  const mobileList = document.getElementById('pesanan-mobile-list');
  const searchInput = document.getElementById('pesanan-search-input');
  const monthFilterSelect = document.getElementById('pesanan-filter-bulan');

  // Jika elemen DOM kerangka sudah ada, update isi tabel & mobile feed tanpa menghancurkan input box
  if (!forceFullRender && tbody && mobileList && searchInput) {
    tbody.innerHTML = getPesananTableRowsHtml(groupedByMonth, sortedMonths, formatRp);
    mobileList.innerHTML = getPesananMobileCardsHtml(groupedByMonth, sortedMonths, formatRp);
    if (document.activeElement !== searchInput) {
      searchInput.value = pesananSearchKeyword;
    }
    if (monthFilterSelect) {
      monthFilterSelect.value = selectedPesananBulan;
    }
    return;
  }

  let html = `
    <div class="card">
      <div class="card-header" style="flex-wrap:wrap; gap:0.75rem;">
        <div class="card-title">📦 Daftar Pesanan Papan Bunga</div>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
          <input type="text" id="pesanan-search-input" class="form-control" style="width:200px; min-width:140px;" placeholder="🔍 Cari pemesan / WA / nota..." 
                 value="${pesananSearchKeyword}" oninput="onSearchPesanan(this.value)">
          
          <select id="pesanan-filter-bulan" class="form-control" style="width:auto; max-width:160px; font-size:0.85rem;" onchange="onFilterPesananBulan(this.value)">
            <option value="ALL" ${selectedPesananBulan === 'ALL' ? 'selected' : ''}>📅 Semua Bulan</option>
            ${availableMonths.map(ym => `
              <option value="${ym}" ${selectedPesananBulan === ym ? 'selected' : ''}>
                📅 ${getPesananNamaBulanTahun(ym)}
              </option>
            `).join('')}
          </select>

          <button class="btn btn-secondary" onclick="openNotaInstanModal()" title="Cetak Nota Instan Tanpa Simpan Database"><span class="icon">🖨️</span> Nota Instan</button>
          <button class="btn btn-primary desktop-only-btn" onclick="openPesananModal()"><span class="icon">➕</span> Tambah Order</button>
        </div>
      </div>

      <!-- Tampilan Desktop (Tabel Berkelompok per Bulan) -->
      <div class="table-responsive desktop-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>No. Nota</th>
              <th>Tanggal</th>
              <th>Pemesan & No. WA</th>
              <th>Jenis & Ucapan</th>
              <th>Harga & Bayar</th>
              <th>Status Bayar</th>
              <th>Proses</th>
              <th style="text-align:right;">Aksi</th>
            </tr>
          </thead>
          <tbody id="pesanan-tbody">
            ${getPesananTableRowsHtml(groupedByMonth, sortedMonths, formatRp)}
          </tbody>
        </table>
      </div>

      <!-- Tampilan Native Mobile Feed Cards (Khusus HP, Berkelompok per Bulan) -->
      <div id="pesanan-mobile-list" class="mobile-card-list">
        ${getPesananMobileCardsHtml(groupedByMonth, sortedMonths, formatRp)}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function onSearchPesanan(val) {
  pesananSearchKeyword = val;
  renderPesananModule(false);
}

async function openPesananModal(id = null) {
  const modal = document.getElementById('modal-pesanan');
  const title = document.getElementById('modal-pesanan-title');
  const form = document.getElementById('form-pesanan');

  const today = typeof getTodayLocal === 'function' ? getTodayLocal() : new Date().toISOString().split('T')[0];

  let data = {
    id: '',
    tanggal: today,
    tanggal_antar: today,
    nama_pemesan: '',
    no_wa: '',
    lokasi_pengantaran: '',
    jenis_papan: '',
    ucapan: '',
    harga: '',
    dibayar: '',
    status_lunas: 0
  };

  if (id) {
    const existing = await db.pesanan.get(id);
    if (existing) {
      data = existing;
      title.innerText = `Edit Pesanan #${existing.no_nota}`;
    }
  } else {
    title.innerText = 'Tambah Pesanan Baru';
  }

  form.pesanan_id.value = data.id || '';
  form.tanggal.value = data.tanggal || today;
  form.tanggal_antar.value = data.tanggal_antar || data.tanggal || today;
  form.nama_pemesan.value = data.nama_pemesan || '';
  if (form.no_wa) form.no_wa.value = data.no_wa || '';
  form.lokasi_pengantaran.value = data.lokasi_pengantaran || '';
  form.jenis_papan.value = data.jenis_papan || '';
  form.ucapan.value = data.ucapan || '';
  form.harga.value = (data.harga !== undefined && data.harga !== null && data.harga !== '') ? data.harga : '';
  form.dibayar.value = (data.dibayar !== undefined && data.dibayar !== null && data.dibayar !== '') ? data.dibayar : '';

  modal.classList.add('active');
}

function closePesananModal() {
  document.getElementById('modal-pesanan').classList.remove('active');
}

async function savePesananForm(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.pesanan_id.value;

  const inputHarga = parseFloat(form.harga.value);
  const inputDibayar = parseFloat(form.dibayar.value);

  const harga = isNaN(inputHarga) ? 300000 : inputHarga;
  const dibayar = isNaN(inputDibayar) ? 0 : inputDibayar;

  const data = {
    tanggal: form.tanggal.value,
    tanggal_antar: form.tanggal_antar.value,
    nama_pemesan: form.nama_pemesan.value,
    no_wa: form.no_wa ? form.no_wa.value.trim() : '',
    lokasi_pengantaran: form.lokasi_pengantaran.value,
    jenis_papan: form.jenis_papan.value.trim() || 'Papan Single',
    ucapan: form.ucapan.value,
    harga,
    dibayar,
    status_lunas: (dibayar >= harga) ? 1 : 0
  };

  if (id) {
    await dbUpdatePesanan(parseInt(id), data);
  } else {
    await dbTambahPesanan(data);
  }

  closePesananModal();
  renderPesananModule();
  if (typeof renderDashboardModule === 'function') renderDashboardModule();
}

async function handleTandaiLunas(id) {
  if (confirm('Tandai pesanan ini sebagai LUNAS? Pelunasan akan dicatat ke Keuangan Kas.')) {
    await dbTandaiLunas(id);
    renderPesananModule();
    if (typeof renderDashboardModule === 'function') renderDashboardModule();
  }
}

async function handleHapusPesanan(id) {
  if (confirm('Apakah Anda yakin ingin menghapus pesanan ini? Transaksi kas terkait juga akan dihapus.')) {
    await dbHapusPesanan(id);
    renderPesananModule();
    if (typeof renderDashboardModule === 'function') renderDashboardModule();
  }
}

// === TANDA TANGAN DIGITAL ECDSA P-256 ===
// Kunci privat HANYA ada di aplikasi lokal. Kunci publik ada di js/verifikasi-kunci.js.
async function generateInvoiceDigitalSignature(no_nota, tanggal, nama_pemesan, harga) {
  const cfg = window.AKIO_FINANCE_VERIFY;
  if (!cfg || !window.FinanceKey) throw new Error('Kunci verifikasi nota belum dimuat');
  const canon = window.FinanceKey.canonical(no_nota, tanggal, nama_pemesan, harga, cfg.fingerprint);
  return window.FinanceKey.signCanonical(canon);
}

function invoiceVerifyParams(no_nota, tanggal, nama_pemesan, harga, signature) {
  const cfg = window.AKIO_FINANCE_VERIFY;
  return new URLSearchParams({
    v: cfg.format,
    no: String(no_nota || ''),
    t: String(tanggal || ''),
    n: String(nama_pemesan || ''),
    total: String(harga || 0),
    k: cfg.fingerprint,
    s: String(signature || '')
  });
}

// === MODAL BUAT NOTA INSTAN (TANPA SIMPAN DATABASE) ===
function openNotaInstanModal() {
  const modal = document.getElementById('modal-nota-instan');
  const form = document.getElementById('form-nota-instan');
  if (!modal || !form) return;

  form.reset();

  // Set tanggal hari ini secara default
  const today = typeof getTodayLocal === 'function' ? getTodayLocal() : new Date().toISOString().split('T')[0];
  const tglInput = document.getElementById('nota-instan-tgl');
  const tglAntarInput = document.getElementById('nota-instan-tgl-antar');
  const noNotaInput = document.getElementById('nota-instan-no');

  if (tglInput) tglInput.value = today;
  if (tglAntarInput) tglAntarInput.value = today;
  
  // Format nomor nota acak otomatis yang rapi tapi tetap bisa diubah
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const dateStr = today.replace(/-/g, '').substring(2);
  if (noNotaInput) noNotaInput.value = `NOTA-${dateStr}-${randomSuffix}`;

  modal.classList.add('active');
}

function closeNotaInstanModal() {
  const modal = document.getElementById('modal-nota-instan');
  if (modal) modal.classList.remove('active');
}

async function handleCetakNotaInstan(e) {
  if (e) e.preventDefault();
  const form = document.getElementById('form-nota-instan');
  if (!form) return;

  const today = typeof getTodayLocal === 'function' ? getTodayLocal() : new Date().toISOString().split('T')[0];
  const formData = new FormData(form);
  const harga = parseFloat(formData.get('harga')) || 0;
  const dibayar = parseFloat(formData.get('dibayar')) || 0;
  const noNota = (formData.get('no_nota') || '').trim() || `MANUAL-${Date.now().toString().slice(-6)}`;
  const tanggal = formData.get('tanggal') || today;
  const tanggalAntar = formData.get('tanggal_antar') || tanggal;
  const namaPemesan = (formData.get('nama_pemesan') || '').trim() || 'Pelanggan';
  const noWa = (formData.get('no_wa') || '').trim();
  const lokasiPengantaran = (formData.get('lokasi_pengantaran') || '').trim();
  const jenisPapan = (formData.get('jenis_papan') || '').trim() || 'Papan Bunga';
  const ucapan = (formData.get('ucapan') || '').trim();
  const isLunas = (harga > 0 && dibayar >= harga) ? 1 : 0;

  const adhocPesanan = {
    no_nota: noNota,
    tanggal: tanggal,
    tanggal_antar: tanggalAntar,
    nama_pemesan: namaPemesan,
    no_wa: noWa,
    lokasi_pengantaran: lokasiPengantaran,
    jenis_papan: jenisPapan,
    harga: harga,
    dibayar: dibayar,
    status_lunas: isLunas,
    ucapan: ucapan
  };

  closeNotaInstanModal();
  await printInvoiceObject(adhocPesanan);
}

async function handleCetakThermalNotaInstan() {
  const form = document.getElementById('form-nota-instan');
  if (!form) return;

  const today = typeof getTodayLocal === 'function' ? getTodayLocal() : new Date().toISOString().split('T')[0];
  const formData = new FormData(form);
  const harga = parseFloat(formData.get('harga')) || 0;
  const dibayar = parseFloat(formData.get('dibayar')) || 0;
  const noNota = (formData.get('no_nota') || '').trim() || `MANUAL-${Date.now().toString().slice(-6)}`;
  const tanggal = formData.get('tanggal') || today;
  const tanggalAntar = formData.get('tanggal_antar') || tanggal;
  const namaPemesan = (formData.get('nama_pemesan') || '').trim() || 'Pelanggan';
  const noWa = (formData.get('no_wa') || '').trim();
  const lokasiPengantaran = (formData.get('lokasi_pengantaran') || '').trim();
  const jenisPapan = (formData.get('jenis_papan') || '').trim() || 'Papan Bunga';
  const ucapan = (formData.get('ucapan') || '').trim();
  const isLunas = (harga > 0 && dibayar >= harga) ? 1 : 0;

  const adhocPesanan = {
    no_nota: noNota,
    tanggal: tanggal,
    tanggal_antar: tanggalAntar,
    nama_pemesan: namaPemesan,
    no_wa: noWa,
    lokasi_pengantaran: lokasiPengantaran,
    jenis_papan: jenisPapan,
    harga: harga,
    dibayar: dibayar,
    status_lunas: isLunas,
    ucapan: ucapan
  };

  closeNotaInstanModal();
  await printThermalReceiptObject(adhocPesanan);
}

// === FUNGSI UTAMA CETAK NOTA LENGKAP DENGAN LOGO, WATERMARK & QR CODE VERIFIKASI ===
async function printInvoiceObject(p) {
  if (!p) return;
  const config = await db.pengaturan.get(1) || {};

  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

  // Tanda tangan ECDSA dengan kunci privat lokal. Gagal → jangan tampilkan "SIGN" palsu.
  let signature = '';
  try {
    signature = await generateInvoiceDigitalSignature(p.no_nota, p.tanggal, p.nama_pemesan, p.harga);
  } catch (err) {
    console.warn('[QR Code] Tanda tangan gagal:', err);
    alert('Kunci nota belum terbuka. Buka menu Pengaturan → isi kata sandi → Buka kunci, lalu cetak ulang nota.');
  }

  // QR selalu mengarah ke halaman verifikasi resmi di GitHub Pages.
  const cfgVerify = window.AKIO_FINANCE_VERIFY;
  const qrParams = invoiceVerifyParams(p.no_nota, p.tanggal, p.nama_pemesan, p.harga, signature);
  const qrText = cfgVerify.verifyUrl + '?' + qrParams.toString();

  let qrDataUrl = '';
  if (signature && typeof qrcode !== 'undefined') {
    try {
      const qrObj = qrcode(0, 'L');
      qrObj.addData(qrText);
      qrObj.make();
      qrDataUrl = qrObj.createDataURL(4, 2);
    } catch (qrErr) {
      console.error('[QR Code] Gagal generate QR Code:', qrErr);
    }
  }

  const qrImgTag = qrDataUrl
    ? `<img src="${qrDataUrl}" alt="QR Code Verifikasi" style="width: 110px; height: 110px; border: 1px solid #ddd; padding: 4px; background: #fff;">`
    : `<div style="width:110px; height:110px; border:2px dashed #ccc; display:flex; align-items:center; justify-content:center; font-size:10px; color:#999; text-align:center; background:#fff;">QR Code<br>Tidak Tersedia</div>`;
  const signLabel = signature
    ? `SIGN: ${signature.slice(0, 12)}… · ${cfgVerify.fingerprint}`
    : 'SIGN: BELUM ADA — buka kunci di Pengaturan';
  const verifyNote = signature
    ? 'Silakan <i>scan</i> QR Code di samping untuk verifikasi keaslian nota.'
    : 'QR verifikasi belum tersedia. Minta nota dicetak ulang setelah kunci dibuka.';

  const isLunas = p.status_lunas === 1 || (p.harga > 0 && p.dibayar >= p.harga);
  const watermarkCss = isLunas ? `
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 110px;
      font-weight: 900;
      color: rgba(40, 167, 69, 0.15);
      border: 8px solid rgba(40, 167, 69, 0.15);
      padding: 10px 30px;
      border-radius: 15px;
      letter-spacing: 10px;
      pointer-events: none;
      z-index: 9999;
      white-space: nowrap;
      text-transform: uppercase;
      font-family: 'Arial Black', Arial, sans-serif;
    }
  ` : '';

  const logoHtml = config.logo_path ? `<img src="${config.logo_path}" alt="Logo Toko" style="max-height: 80px; max-width: 100px; margin-right: 15px;">` : '';

  // Build full HTML document for print popup
  const printHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invoice ${p.no_nota}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 24px; color: #555; background: #fff; }
  ${watermarkCss}
  .invoice-box {
    position: relative; max-width: 800px; margin: auto; padding: 30px;
    border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.15);
  }
  .top-table { width: 100%; text-align: left; margin-bottom: 20px; }
  .title { font-size: 28px; font-weight: bold; color: #333; text-transform: uppercase; }
  .info-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
  .info-table th, .info-table td { padding: 10px; border: 1px solid #ddd; }
  .info-table th { background: #eee; text-align: left; }
  .total-row { font-weight: bold; background: #f9f9f9; }
  .status-badge { display: inline-block; padding: 5px 10px; border-radius: 5px; color: white; background-color: ${isLunas ? '#28a745' : '#dc3545'}; font-weight: bold; }
  img { display: inline-block; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .invoice-box { box-shadow: none; border: none; }
  }
</style>
</head><body>
  <div class="invoice-box">
    ${isLunas ? '<div class="watermark">LUNAS</div>' : ''}
    <table class="top-table">
      <tr>
        ${logoHtml ? `<td style="width: 15%; vertical-align: top;">${logoHtml}</td>` : ''}
        <td class="title" style="width: ${logoHtml ? '50%' : '65%'}; vertical-align: top;">
          <span style="font-size: 32px; color: #000; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">${config.nama_toko || 'AKIO FLORIST'}</span><br>
          <span style="font-size: 13px; font-weight: normal; color: #7f8c8d; letter-spacing: 2px;">${config.tagline || 'SPECIALIST PAPAN BUNGA'}</span><br>
          <span style="font-size: 11px; font-weight: normal; color: #555;">${config.alamat || ''} ${config.telepon ? '| WA: ' + config.telepon : ''}</span><br><br>
          <span style="font-size: 18px; text-decoration: underline;">INVOICE PESANAN</span>
        </td>
        <td style="text-align: right; vertical-align: top;">
          <b>No Nota:</b> ${p.no_nota}<br>
          <b>Tanggal Pesan:</b> ${p.tanggal}<br>
          <b>Status:</b> <span class="status-badge">${isLunas ? 'LUNAS' : 'BELUM LUNAS'}</span>
        </td>
      </tr>
    </table>
    <hr style="border: 0; border-top: 1px solid #eee;">
    <div style="margin-top: 15px;">
      <b>Ditujukan kepada:</b><br>
      Pemesan : <b>${p.nama_pemesan}</b> ${p.no_wa ? `(WA: ${p.no_wa})` : ''}<br>
      Lokasi Pengantaran : ${p.lokasi_pengantaran || '-'}<br>
      Tanggal Pengantaran : <b>${p.tanggal_antar || p.tanggal}</b>
    </div>
    <table class="info-table">
      <thead><tr><th>Deskripsi Pesanan</th><th style="width: 200px; text-align: right;">Total / Harga</th></tr></thead>
      <tbody>
        <tr>
          <td><b>Jenis/Ukuran Papan:</b> ${p.jenis_papan}<br><br><b>Catatan Ucapan Tertulis:</b><br><i>"${p.ucapan || '-'}"</i></td>
          <td style="text-align: right; vertical-align: bottom;">${formatRp(p.harga)}</td>
        </tr>
        <tr class="total-row"><td style="text-align: right;">TOTAL BAYAR</td><td style="text-align: right; font-size: 18px;">${formatRp(p.harga)}</td></tr>
        <tr class="total-row" style="color: #28a745;"><td style="text-align: right;">TELAH DIBAYAR</td><td style="text-align: right; font-size: 15px;">${formatRp(p.dibayar)}</td></tr>
        <tr class="total-row" style="color: #dc3545;"><td style="text-align: right;">SISA TAGIHAN</td><td style="text-align: right; font-size: 15px;">${formatRp(p.harga - p.dibayar)}</td></tr>
      </tbody>
    </table>
    <table style="width: 100%; margin-top: 40px;">
      <tr>
        <td style="width: 70%; text-align: left; color: #777; vertical-align: top;">
          <p>Terima kasih atas pesanan papan bunga Anda!</p>
          <p style="font-size: 11px; margin-top: 15px;">
            * Invoice ini sah dan dicetak secara otomatis (komputerisasi).<br>
            ${verifyNote}
          </p>
        </td>
        <td style="width: 30%; text-align: right; vertical-align: top;">
          ${qrImgTag}<br>
          <span style="font-size: 10px; color: #777; font-family: monospace;">${signLabel}</span>
        </td>
      </tr>
    </table>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    };
  </script>
</body></html>`;

  // Open popup window for print — bypasses all @media print CSS conflicts
  const printWin = window.open('', '_blank', 'width=850,height=700');
  if (!printWin) {
    alert('Pop-up diblokir oleh browser! Silakan izinkan pop-up untuk mencetak nota.');
    return;
  }
  printWin.document.open();
  printWin.document.write(printHtml);
  printWin.document.close();

  // Fallback trigger cetak jika onload window tidak terpicu
  setTimeout(() => {
    try {
      printWin.focus();
      printWin.print();
    } catch (e) {}
  }, 500);
}

// Wrapper cetak nota untuk data pesanan yang tersimpan di database
async function printNotaPesanan(id) {
  const p = await db.pesanan.get(id);
  if (!p) {
    alert('Data pesanan tidak ditemukan!');
    return;
  }
  await printInvoiceObject(p);
}

// === FUNGSI CETAK STRUK THERMAL (58mm / 80mm POS PRINTER) ===
async function printThermalReceiptObject(p) {
  if (!p) return;
  const config = await db.pengaturan.get(1) || {};
  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

  const namaToko = (config.nama_toko || 'AKIO FLORIST').toUpperCase();
  const tagline = config.tagline || 'Pusat Karangan Bunga';
  const alamat = config.alamat || '';
  const telepon = config.telepon || '';
  const noNota = p.no_nota || '-';
  const tgl = p.tanggal || p.tanggal_antar || (typeof getTodayLocal === 'function' ? getTodayLocal() : '');
  const tglAntar = p.tanggal_antar || '-';
  const pemesan = p.nama_pemesan || '-';
  const noWa = p.no_wa || '';
  const lokasi = p.lokasi_pengantaran || '-';
  const jenis = p.jenis_papan || 'Karangan Bunga';
  const ucapan = p.ucapan || '';
  const harga = parseFloat(p.harga) || 0;
  const dibayar = parseFloat(p.dibayar) || 0;
  const sisa = Math.max(0, harga - dibayar);
  const isLunas = (harga > 0 && dibayar >= harga) || p.status_lunas == 1;

  const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Struk - ${noNota}</title>
  <style>
    @page {
      margin: 0;
      size: 58mm auto;
    }
    @media print {
      body { width: 58mm; margin: 0; padding: 2mm 3mm; }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.3;
      color: #000;
      background: #fff;
      margin: 0 auto;
      padding: 6px 4px;
      width: 58mm;
      max-width: 100%;
      box-sizing: border-box;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .store-name {
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    .badge {
      display: inline-block;
      padding: 1px 6px;
      border: 1px solid #000;
      font-weight: bold;
      margin-top: 3px;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="store-name">${namaToko}</div>
    ${tagline ? `<div style="font-size:9px;">${tagline}</div>` : ''}
    ${alamat ? `<div style="font-size:9px;">${alamat}</div>` : ''}
    ${telepon ? `<div style="font-size:9px;">Telp/WA: ${telepon}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div class="row"><span>Nota:</span><span class="bold">${noNota}</span></div>
  <div class="row"><span>Tgl:</span><span>${tgl}</span></div>
  <div class="row"><span>Customer:</span><span class="bold">${pemesan}</span></div>
  ${noWa ? `<div class="row"><span>WA:</span><span>${noWa}</span></div>` : ''}
  ${tglAntar && tglAntar !== '-' ? `<div class="row"><span>Tgl Antar:</span><span>${tglAntar}</span></div>` : ''}
  ${lokasi && lokasi !== '-' ? `<div style="margin-top:2px; font-size:10px;"><b>Lokasi:</b> ${lokasi}</div>` : ''}

  <div class="divider"></div>

  <div style="font-weight:bold; margin-bottom:2px;">${jenis}</div>
  ${ucapan && ucapan !== '-' ? `<div style="font-size:9.5px; font-style:italic; margin-bottom:3px; word-break:break-word;">"${ucapan}"</div>` : ''}

  <div class="divider"></div>

  <div class="row"><span>Total:</span><span class="bold">${formatRp(harga)}</span></div>
  <div class="row"><span>Dibayar:</span><span>${formatRp(dibayar)}</span></div>
  <div class="row bold">
    <span>${isLunas ? 'Status:' : 'Sisa Tagihan:'}</span>
    <span>${isLunas ? 'LUNAS' : formatRp(sisa)}</span>
  </div>

  <div class="text-center" style="margin-top:4px;">
    <span class="badge">${isLunas ? '*** LUNAS ***' : '*** BELUM LUNAS ***'}</span>
  </div>

  <div class="divider"></div>

  <div class="text-center" style="font-size:9px; margin-top:4px;">
    Terima kasih atas pesanan Anda!<br>
    Simpan struk ini sebagai bukti resmi.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=450,height=600');
  if (!printWin) {
    alert('Pop-up diblokir oleh browser! Silakan izinkan pop-up untuk mencetak struk.');
    return;
  }
  printWin.document.open();
  printWin.document.write(printHtml);
  printWin.document.close();

  setTimeout(() => {
    try {
      printWin.focus();
      printWin.print();
    } catch (e) {}
  }, 500);
}

// Wrapper cetak struk thermal untuk pesanan tersimpan
async function printThermalNotaPesanan(id) {
  const p = await db.pesanan.get(id);
  if (!p) {
    alert('Data pesanan tidak ditemukan!');
    return;
  }
  await printThermalReceiptObject(p);
}

// === VERIFIKASI QR NOTA (ECDSA P-256) ===
function escapeFinanceHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

async function verifyInvoiceSignature(canon, signature) {
  const cfg = window.AKIO_FINANCE_VERIFY;
  if (!cfg || !cfg.publicJwk || !window.crypto || !crypto.subtle) return false;
  try {
    const key = await crypto.subtle.importKey(
      'jwk', cfg.publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    );
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, key,
      financeFromB64url(signature), new TextEncoder().encode(canon)
    );
  } catch (e) {
    return false;
  }
}

function financeFromB64url(str) {
  const s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = s + '='.repeat((4 - s.length % 4) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function checkUrlInvoiceVerification() {
  const params = new URLSearchParams(window.location.search);
  const hasLegacy = params.get('nota') && params.get('sign');
  const hasNew = params.get('v') === 'AKIOFIN1' && params.get('s');
  if (!hasLegacy && !hasNew) return;

  const cfg = window.AKIO_FINANCE_VERIFY || {};
  const config = await db.pengaturan.get(1) || {};
  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val) || 0);

  const no = params.get('no') || params.get('nota') || '-';
  const tgl = params.get('t') || params.get('tgl') || '';
  const nama = params.get('n') || '';
  const total = params.get('total') || '';
  const kid = params.get('k') || '';
  const signature = params.get('s') || params.get('sign') || '';

  let level = 'bad';
  let statusText = 'TIDAK VALID';
  let statusDesc = 'Tanda tangan digital tidak cocok. Data nota mungkin sudah diubah.';
  let detailNama = no;

  if (hasNew && window.FinanceKey && kid === cfg.fingerprint) {
    const canon = window.FinanceKey.canonical(no, tgl, nama, total, kid);
    if (await verifyInvoiceSignature(canon, signature)) {
      level = 'ok';
      statusText = 'SAH & RESMI';
      statusDesc = 'Tanda tangan digital cocok dengan kunci resmi toko.';
      detailNama = `${no}${nama ? ' — ' + nama : ''}`;
    }
  } else if (hasLegacy && !hasNew && /^[0-9A-F]{12}$/i.test(signature)) {
    level = 'warn';
    statusText = 'FORMAT LAMA';
    statusDesc = 'Nota ini memakai tanda tangan lama yang kuncinya sudah dipublikasikan. Keaslian tidak dapat dijamin — minta nota cetak ulang.';
  } else if (hasNew && kid && kid !== cfg.fingerprint) {
    statusDesc = 'Nota ditandatangani dengan kunci lain, bukan kunci resmi toko ini.';
  }

  const appRoot = document.getElementById('app-root');
  if (appRoot) appRoot.style.display = 'none';

  let page = document.getElementById('standalone-verification-page');
  if (!page) {
    page = document.createElement('div');
    page.id = 'standalone-verification-page';
    document.body.appendChild(page);
  }
  page.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0f172a;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;padding:1.5rem;box-sizing:border-box;z-index:99999;overflow:auto;';

  const color = level === 'ok' ? '#34d399' : level === 'warn' ? '#fbbf24' : '#f87171';
  const icon = level === 'ok' ? '🛡️' : level === 'warn' ? '⚠️' : '✗';
  const expectedHost = (() => { try { return new URL(cfg.verifyUrl || '').hostname; } catch (e) { return ''; } })();
  const hostWarning = expectedHost && location.hostname !== expectedHost
    ? `<div style="background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.4);color:#fbbf24;border-radius:10px;padding:0.7rem;margin-bottom:1rem;font-size:0.78rem;text-align:left;">⚠️ Halaman ini bukan di domain resmi ${escapeFinanceHtml(expectedHost)}. Pastikan QR mengarah ke situs resmi toko.</div>`
    : '';

  page.innerHTML = `
    <div style="background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:2rem;max-width:500px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,0.5);text-align:center;">
      ${hostWarning}
      <div style="width:70px;height:70px;background:rgba(255,255,255,0.06);border:2px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-size:2.2rem;">${icon}</div>
      <h2 style="font-size:1.3rem;font-weight:800;color:${color};margin-bottom:0.25rem;">VERIFIKASI KEASLIAN NOTA</h2>
      <div style="font-size:0.85rem;color:#94a3b8;margin-bottom:1.5rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;">${escapeFinanceHtml(config.nama_toko || 'AKIO FLORIST')}</div>
      <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:1.25rem;text-align:left;margin-bottom:1.5rem;font-size:0.9rem;">
        <div style="display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:0.6rem;margin-bottom:0.6rem;">
          <span style="color:#94a3b8;">Status Keaslian:</span>
          <span style="color:${color};font-weight:700;text-align:right;">${escapeFinanceHtml(statusText)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:0.6rem;margin-bottom:0.6rem;">
          <span style="color:#94a3b8;">Nota & Pemesan:</span>
          <span style="font-weight:700;color:#fff;text-align:right;">${escapeFinanceHtml(detailNama)}</span>
        </div>
        ${tgl ? `<div style="display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:0.6rem;margin-bottom:0.6rem;"><span style="color:#94a3b8;">Tanggal:</span><span style="color:#60a5fa;font-weight:600;">${escapeFinanceHtml(tgl)}</span></div>` : ''}
        ${total ? `<div style="display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:0.6rem;margin-bottom:0.6rem;"><span style="color:#94a3b8;">Nilai Pesanan:</span><span style="color:#fbbf24;font-weight:700;">${escapeFinanceHtml(formatRp(total))}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;gap:1rem;">
          <span style="color:#94a3b8;">Digital Signature:</span>
          <span style="font-family:monospace;font-size:0.8rem;color:#a855f7;font-weight:700;text-align:right;">${escapeFinanceHtml(signature ? signature.slice(0, 16) + '…' : '-')}</span>
        </div>
      </div>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:1.5rem;line-height:1.5;">${escapeFinanceHtml(statusDesc)}</p>
      <button class="btn btn-secondary" style="width:100%;border-radius:10px;" onclick="openMainAppFromVerification()">🚀 Buka Aplikasi Utama</button>
    </div>
  `;
}

function openMainAppFromVerification() {
  const standalonePage = document.getElementById('standalone-verification-page');
  if (standalonePage) standalonePage.style.display = 'none';

  const appRoot = document.getElementById('app-root');
  if (appRoot) appRoot.style.display = 'flex';
}

// Jalankan periksa verifikasi URL saat script dimuat
setTimeout(checkUrlInvoiceVerification, 300);
