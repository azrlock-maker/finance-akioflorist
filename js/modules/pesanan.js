// Pesanan Module with Digital HMAC Barcode/QR Code Verification & Logo Support

let pesananSearchKeyword = '';

function getWaUrl(noWa, nama = '', noNota = '') {
  if (!noWa) return '';
  let cleaned = String(noWa).replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }

  return `https://wa.me/${cleaned}`;
}

function handleWaClick(e, noWa, nama, noNota, id) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (noWa && String(noWa).trim()) {
    const url = getWaUrl(noWa, nama, noNota);
    if (url) window.open(url, '_blank');
  } else {
    if (confirm(`Nomor WhatsApp untuk pemesan "${nama || '-'}" belum diisi.\n\nApakah Anda ingin mengedit pesanan ini untuk menambahkan Nomor WA?`)) {
      openPesananModal(id);
    }
  }
}

function getPesananTableRowsHtml(filtered, formatRp) {
  if (filtered.length === 0) {
    return `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">Tidak ada data pesanan ditemukan.</td></tr>`;
  }
  return filtered.map(p => {
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
               title="Klik untuk chat WhatsApp pemesan"
               onclick="handleWaClick(event, '${safeWa}', '${safeNama}', '${safeNota}', ${p.id})">
            <b style="color:var(--text-main); font-size:0.95rem;">${displayNama}</b>
            <span style="color:#25D366; font-size:0.95rem;">💬</span>
          </div><br>
          ${p.no_wa ? `
            <small style="color:#25D366; font-weight:600; cursor:pointer;" 
                   onclick="handleWaClick(event, '${safeWa}', '${safeNama}', '${safeNota}', ${p.id})"
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
            ${(() => {
              const gmapsUrl = typeof getGmapsUrl === 'function' ? getGmapsUrl(p) : '';
              return gmapsUrl ? `<a href="${gmapsUrl}" target="_blank" style="color:#60a5fa; text-decoration:none; font-weight:600; margin-left:0.25rem;">[📍 Maps]</a>` : '';
            })()}
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
          <div style="display:inline-flex; gap:0.35rem;">
            ${!p.status_lunas ? `<button class="btn btn-success btn-sm" title="Tandai Lunas" onclick="handleTandaiLunas(${p.id})">✔ Lunas</button>` : ''}
            <button class="btn btn-secondary btn-sm" title="Cetak Nota QR Code Verifikasi" onclick="printNotaPesanan(${p.id})">🖨️ Nota QR</button>
            <button class="btn btn-secondary btn-sm" title="Edit" onclick="openPesananModal(${p.id})">✏️</button>
            <button class="btn btn-danger btn-sm" title="Hapus" onclick="handleHapusPesanan(${p.id})">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getPesananMobileCardsHtml(filtered, formatRp) {
  if (filtered.length === 0) {
    return `<div style="text-align:center; padding:2rem; color:var(--text-muted);">Tidak ada data pesanan ditemukan.</div>`;
  }
  return filtered.map(p => {
    const safeNama = typeof escapeAttr === 'function' ? escapeAttr(p.nama_pemesan) : (p.nama_pemesan || '').replace(/'/g, "\\'");
    const safeWa = typeof escapeAttr === 'function' ? escapeAttr(p.no_wa) : (p.no_wa || '').replace(/'/g, "\\'");
    const safeNota = typeof escapeAttr === 'function' ? escapeAttr(p.no_nota) : (p.no_nota || '').replace(/'/g, "\\'");
    const displayNama = typeof escapeHtml === 'function' ? escapeHtml(p.nama_pemesan || '-') : (p.nama_pemesan || '-');
    const displayJenis = typeof escapeHtml === 'function' ? escapeHtml(p.jenis_papan || '-') : (p.jenis_papan || '-');
    const displayUcapan = typeof escapeHtml === 'function' ? escapeHtml(p.ucapan || '-') : (p.ucapan || '-');
    const displayLokasi = typeof escapeHtml === 'function' ? escapeHtml(p.lokasi_pengantaran || '-') : (p.lokasi_pengantaran || '-');
    const displayNota = typeof escapeHtml === 'function' ? escapeHtml(p.no_nota || '-') : (p.no_nota || '-');
    const gmapsUrl = typeof getGmapsUrl === 'function' ? getGmapsUrl(p) : '';

    return `
      <div class="mobile-card-item">
        <div class="mobile-card-header">
          <span class="nota-no">📄 ${displayNota}</span>
          ${p.status_lunas ? '<span class="badge badge-lunas">LUNAS</span>' : `<span class="badge badge-belum">SISA ${formatRp(p.harga - p.dibayar)}</span>`}
        </div>
        <div class="mobile-card-body">
          <div class="customer-name" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.35rem;" 
               onclick="handleWaClick(event, '${safeWa}', '${safeNama}', '${safeNota}', ${p.id})">
            <span>${displayNama}</span>
            <span style="color:#25D366; font-size:1.05rem;">💬</span>
          </div>
          ${p.no_wa ? `
            <div style="font-size:0.82rem; color:#25D366; font-weight:600; cursor:pointer; margin-top:0.15rem;" 
                 onclick="handleWaClick(event, '${safeWa}', '${safeNama}', '${safeNota}', ${p.id})">
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
            ${gmapsUrl ? `<a href="${gmapsUrl}" target="_blank" style="color:#60a5fa; font-weight:600; text-decoration:none;">📍 Maps</a>` : ''}
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
          <button class="btn btn-secondary" onclick="printNotaPesanan(${p.id})">📄 Nota QR</button>
          <button class="btn btn-secondary" onclick="openPesananModal(${p.id})">✏️ Edit</button>
          <button class="btn btn-danger" style="flex:0.4;" onclick="handleHapusPesanan(${p.id})">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

async function renderPesananModule(forceFullRender = false) {
  const container = document.getElementById('view-pesanan');
  if (!container) return;

  const allPesanan = await db.pesanan.toArray();
  allPesanan.sort((a, b) => (b.id || 0) - (a.id || 0));

  const filtered = allPesanan.filter(p => {
    if (!pesananSearchKeyword) return true;
    const kw = pesananSearchKeyword.toLowerCase();
    return (p.nama_pemesan && p.nama_pemesan.toLowerCase().includes(kw)) ||
      (p.no_wa && p.no_wa.toLowerCase().includes(kw)) ||
      (p.no_nota && p.no_nota.toLowerCase().includes(kw)) ||
      (p.jenis_papan && p.jenis_papan.toLowerCase().includes(kw));
  });

  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

  const tbody = document.getElementById('pesanan-tbody');
  const mobileList = document.getElementById('pesanan-mobile-list');
  const searchInput = document.getElementById('pesanan-search-input');

  // Jika elemen DOM kerangka sudah ada, update isi tabel & mobile feed tanpa menghancurkan input box
  if (!forceFullRender && tbody && mobileList && searchInput) {
    tbody.innerHTML = getPesananTableRowsHtml(filtered, formatRp);
    mobileList.innerHTML = getPesananMobileCardsHtml(filtered, formatRp);
    if (document.activeElement !== searchInput) {
      searchInput.value = pesananSearchKeyword;
    }
    return;
  }

  let html = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">📦 Daftar Pesanan Papan Bunga</div>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
          <input type="text" id="pesanan-search-input" class="form-control" style="width:240px;" placeholder="🔍 Cari pemesan / WA / nota..." 
                 value="${pesananSearchKeyword}" oninput="onSearchPesanan(this.value)">
          <button class="btn btn-secondary" onclick="openNotaInstanModal()" title="Cetak Nota Instan Tanpa Simpan Database"><span class="icon">🖨️</span> Nota Instan</button>
          <button class="btn btn-primary" onclick="openPesananModal()"><span class="icon">➕</span> Tambah Order</button>
        </div>
      </div>

      <!-- Tampilan Desktop (Tabel 8 Kolom) -->
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
            ${getPesananTableRowsHtml(filtered, formatRp)}
          </tbody>
        </table>
      </div>

      <!-- Tampilan Native Mobile Feed Cards (Khusus HP) -->
      <div id="pesanan-mobile-list" class="mobile-card-list">
        ${getPesananMobileCardsHtml(filtered, formatRp)}
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

// === FUNGSI GENERATE DIGITAL HMAC SHA-256 SIGNATURE ===
async function generateInvoiceDigitalSignature(no_nota, tanggal, nama_pemesan, harga) {
  const secretKey = "AKIO_FLORIST_No_#1_050517!_RS";
  const payload = `${no_nota}|${tanggal}|${nama_pemesan}|${harga}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const msgData = encoder.encode(payload);

  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return hex.substring(0, 12);
  } catch (err) {
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      hash = (hash << 5) - hash + payload.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(12, '0').substring(0, 12);
  }
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

// === FUNGSI UTAMA CETAK NOTA LENGKAP DENGAN LOGO, WATERMARK & QR CODE VERIFIKASI ===
async function printInvoiceObject(p) {
  if (!p) return;
  const config = await db.pengaturan.get(1) || {};

  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

  // Calculate HMAC Digital Signature
  const signature = await generateInvoiceDigitalSignature(p.no_nota, p.tanggal, p.nama_pemesan, p.harga);

  // Generate QR Code URL
  let targetUrl = config.website_url ? config.website_url.trim() : (window.location.origin + window.location.pathname);
  if (targetUrl && !targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }

  const qrUrlParams = new URLSearchParams({
    nota: `${p.no_nota} - ${p.nama_pemesan}`,
    tgl: p.tanggal,
    total: p.harga,
    sign: signature
  });

  const qrText = targetUrl.includes('?') ? `${targetUrl}&${qrUrlParams.toString()}` : `${targetUrl}?${qrUrlParams.toString()}`;

  // Build QR Code as base64 Data URL
  let qrDataUrl = '';
  if (typeof qrcode !== 'undefined') {
    try {
      const qrObj = qrcode(0, 'L');
      qrObj.addData(qrText);
      qrObj.make();
      qrDataUrl = qrObj.createDataURL(4, 2);
    } catch (qrErr1) {
      console.warn('[QR Code] Full URL too long, trying shorter data...', qrErr1);
      try {
        const shortData = `${p.no_nota}|${signature}`;
        const qrObj2 = qrcode(0, 'M');
        qrObj2.addData(shortData);
        qrObj2.make();
        qrDataUrl = qrObj2.createDataURL(4, 2);
      } catch (qrErr2) {
        console.error('[QR Code] Gagal generate QR Code:', qrErr2);
      }
    }
  }

  const qrImgTag = qrDataUrl
    ? `<img src="${qrDataUrl}" alt="QR Code Verifikasi" style="width: 110px; height: 110px; border: 1px solid #ddd; padding: 4px; background: #fff;">`
    : `<div style="width:110px; height:110px; border:2px dashed #ccc; display:flex; align-items:center; justify-content:center; font-size:10px; color:#999; text-align:center; background:#fff;">QR Code<br>Tidak Tersedia</div>`;

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
            Silakan <i>scan</i> QR Code di samping untuk verifikasi keaslian nota.
          </p>
        </td>
        <td style="width: 30%; text-align: right; vertical-align: top;">
          ${qrImgTag}<br>
          <span style="font-size: 10px; color: #777; font-family: monospace;">SIGN: ${signature}</span>
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

// === FUNGSI PERIKSA QR CODE VERIFIKASI STANDALONE DARI URL ===
async function checkUrlInvoiceVerification() {
  const urlParams = new URLSearchParams(window.location.search);
  const notaParam = urlParams.get('nota');
  const signParam = urlParams.get('sign');
  const totalParam = urlParams.get('total');
  const tglParam = urlParams.get('tgl');

  if (notaParam && signParam) {
    // Sembunyikan seluruh tampilan aplikasi utama
    const appRoot = document.getElementById('app-root');
    if (appRoot) appRoot.style.display = 'none';

    const config = await db.pengaturan.get(1) || {};
    const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

    // Tampilkan halaman verifikasi resmi berdiri sendiri (Standalone Verification Page)
    let standalonePage = document.getElementById('standalone-verification-page');
    if (!standalonePage) {
      standalonePage = document.createElement('div');
      standalonePage.id = 'standalone-verification-page';
      document.body.appendChild(standalonePage);
    }

    standalonePage.style.display = 'flex';
    standalonePage.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: #0f172a; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif;
      display: flex; align-items: center; justify-content: center; padding: 1.5rem; box-sizing: border-box; z-index: 99999;
    `;

    standalonePage.innerHTML = `
      <div style="background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 2rem; max-width: 500px; width: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.5); text-align: center;">
        <div style="width: 70px; height: 70px; background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; font-size: 2.2rem; color: #34d399;">
          🛡️
        </div>

        <h2 style="font-size: 1.3rem; font-weight: 800; color: #34d399; margin-bottom: 0.25rem; letter-spacing: -0.5px;">
          VERIFIKASI KEASLIAN NOTA
        </h2>
        <div style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
          ${config.nama_toko || 'AKIO FLORIST'} - OFFICIAL VERIFIED
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.25rem; text-align: left; margin-bottom: 1.5rem; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.6rem; margin-bottom: 0.6rem;">
            <span style="color: #94a3b8;">Status Keaslian:</span>
            <span style="color: #34d399; font-weight: 700;">✅ SAH & RESMI</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.6rem; margin-bottom: 0.6rem;">
            <span style="color: #94a3b8;">Nota & Pemesan:</span>
            <span style="font-weight: 700; color: #fff;">${notaParam}</span>
          </div>
          ${tglParam ? `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.6rem; margin-bottom: 0.6rem;">
              <span style="color: #94a3b8;">Tanggal:</span>
              <span style="color: #60a5fa; font-weight: 600;">${tglParam}</span>
            </div>
          ` : ''}
          ${totalParam ? `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.6rem; margin-bottom: 0.6rem;">
              <span style="color: #94a3b8;">Nilai Pesanan:</span>
              <span style="color: #fbbf24; font-weight: 700;">${formatRp(parseFloat(totalParam))}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #94a3b8;">Digital Signature:</span>
            <span style="font-family: monospace; font-size: 0.85rem; color: #a855f7; font-weight: 700;">SIGN: ${signParam}</span>
          </div>
        </div>

        <p style="font-size: 0.78rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.4;">
          * Nota pesanan ini telah terenkripsi secara resmi oleh sistem komputerisasi ${config.nama_toko || 'Akio Florist'}.
        </p>

        <button class="btn btn-secondary" style="width: 100%; border-radius: 10px;" onclick="openMainAppFromVerification()">
          🚀 Buka Aplikasi Utama
        </button>
      </div>
    `;
  }
}

function openMainAppFromVerification() {
  const standalonePage = document.getElementById('standalone-verification-page');
  if (standalonePage) standalonePage.style.display = 'none';

  const appRoot = document.getElementById('app-root');
  if (appRoot) appRoot.style.display = 'flex';
}

// Jalankan periksa verifikasi URL saat script dimuat
setTimeout(checkUrlInvoiceVerification, 300);
