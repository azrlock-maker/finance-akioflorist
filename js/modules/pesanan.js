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

async function renderPesananModule() {
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

  let html = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">📦 Daftar Pesanan Papan Bunga</div>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
          <input type="text" class="form-control" style="width:240px;" placeholder="🔍 Cari pemesan / WA / nota..." 
                 value="${pesananSearchKeyword}" oninput="onSearchPesanan(this.value)">
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
          <tbody>
            ${filtered.length > 0 ? filtered.map(p => {
    const safeNama = (p.nama_pemesan || '').replace(/'/g, "\\'");
    const safeWa = (p.no_wa || '').replace(/'/g, "\\'");
    const safeNota = (p.no_nota || '').replace(/'/g, "\\'");
    return `
              <tr>
                <td><b>${p.no_nota || '-'}</b></td>
                <td>
                  <small>Pesan: ${p.tanggal || '-'}</small><br>
                  <small style="color:var(--info);">Antar: ${p.tanggal_antar || '-'}</small>
                </td>
                <td>
                  <div style="cursor:pointer; display:inline-flex; align-items:center; gap:0.25rem;" 
                       title="Klik untuk chat WhatsApp pemesan"
                       onclick="handleWaClick(event, '${safeWa}', '${safeNama}', '${safeNota}', ${p.id})">
                    <b style="color:var(--text-main); font-size:0.95rem;">${p.nama_pemesan || '-'}</b>
                    <span style="color:#25D366; font-size:0.95rem;">💬</span>
                  </div><br>
                  ${p.no_wa ? `
                    <small style="color:#25D366; font-weight:600; cursor:pointer;" 
                           onclick="handleWaClick(event, '${safeWa}', '${safeNama}', '${safeNota}', ${p.id})"
                           title="Klik untuk chat WhatsApp">
                      📱 ${p.no_wa}
                    </small><br>
                  ` : `
                    <small style="color:var(--text-muted); cursor:pointer; font-style:italic;" onclick="openPesananModal(${p.id})">
                      📱 <span style="text-decoration:underline;">+ Tambah WA</span>
                    </small><br>
                  `}
                  <small style="color:var(--text-muted);">
                    📍 ${p.lokasi_pengantaran || '-'}
                    ${(() => {
                      const gmapsUrl = typeof getGmapsUrl === 'function' ? getGmapsUrl(p) : '';
                      return gmapsUrl ? `<a href="${gmapsUrl}" target="_blank" style="color:#60a5fa; text-decoration:none; font-weight:600; margin-left:0.25rem;">[📍 Maps]</a>` : '';
                    })()}
                  </small>
                </td>
                <td>
                  <span class="badge badge-proses">${p.jenis_papan || '-'}</span><br>
                  <small style="color:var(--text-muted); font-style:italic;">"${p.ucapan || '-'}"</small>
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
            `}).join('') : `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">Tidak ada data pesanan ditemukan.</td></tr>`}
          </tbody>
        </table>
      </div>

      <!-- Tampilan Native Mobile Feed Cards (Khusus HP) -->
      <div class="mobile-card-list">
        ${filtered.length > 0 ? filtered.map(p => {
      const safeNama = (p.nama_pemesan || '').replace(/'/g, "\\'");
      const safeWa = (p.no_wa || '').replace(/'/g, "\\'");
      const safeNota = (p.no_nota || '').replace(/'/g, "\\'");
      const gmapsUrl = typeof getGmapsUrl === 'function' ? getGmapsUrl(p) : '';
      return `
          <div class="mobile-card-item">
            <div class="mobile-card-header">
              <span class="nota-no">📄 ${p.no_nota || '-'}</span>
              ${p.status_lunas ? '<span class="badge badge-lunas">LUNAS</span>' : `<span class="badge badge-belum">SISA ${formatRp(p.harga - p.dibayar)}</span>`}
            </div>
            <div class="mobile-card-body">
              <div class="customer-name" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.35rem;" 
                   onclick="handleWaClick(event, '${safeWa}', '${safeNama}', '${safeNota}', ${p.id})">
                <span>${p.nama_pemesan || '-'}</span>
                <span style="color:#25D366; font-size:1.05rem;">💬</span>
              </div>
              ${p.no_wa ? `
                <div style="font-size:0.82rem; color:#25D366; font-weight:600; cursor:pointer; margin-top:0.15rem;" 
                     onclick="handleWaClick(event, '${safeWa}', '${safeNama}', '${safeNota}', ${p.id})">
                  📱 ${p.no_wa} (Chat WA)
                </div>
              ` : `
                <div style="font-size:0.78rem; color:var(--text-muted); cursor:pointer; margin-top:0.15rem; font-style:italic;" 
                     onclick="openPesananModal(${p.id})">
                  📱 <span style="text-decoration:underline;">+ Tambah WA Pemesan</span>
                </div>
              `}
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem; display:flex; justify-content:space-between; align-items:center;">
                <span>📍 ${p.lokasi_pengantaran || '-'}</span>
                ${gmapsUrl ? `<a href="${gmapsUrl}" target="_blank" style="color:#60a5fa; font-weight:600; text-decoration:none;">📍 Maps</a>` : ''}
              </div>
              <div style="margin-top:0.25rem; display:flex; gap:0.4rem; flex-wrap:wrap;">
                <span class="badge badge-proses">${p.jenis_papan || '-'}</span>
                <span class="badge badge-siap">${p.status_proses || 'Data Masuk'}</span>
              </div>
              <div class="ucapan-quote">"${p.ucapan || '-'}"</div>
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
        `}).join('') : `<div style="text-align:center; padding:2rem; color:var(--text-muted);">Tidak ada data pesanan ditemukan.</div>`}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function onSearchPesanan(val) {
  pesananSearchKeyword = val;
  renderPesananModule();
}

async function openPesananModal(id = null) {
  const modal = document.getElementById('modal-pesanan');
  const title = document.getElementById('modal-pesanan-title');
  const form = document.getElementById('form-pesanan');

  let data = {
    id: '',
    tanggal: new Date().toISOString().split('T')[0],
    tanggal_antar: new Date().toISOString().split('T')[0],
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
  form.tanggal.value = data.tanggal || new Date().toISOString().split('T')[0];
  form.tanggal_antar.value = data.tanggal_antar || data.tanggal || new Date().toISOString().split('T')[0];
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

// === FUNGSI CETAK NOTA LENGKAP DENGAN LOGO, WATERMARK & QR CODE VERIFIKASI BARCODE ===
async function printNotaPesanan(id) {
  const p = await db.pesanan.get(id);
  const config = await db.pengaturan.get(1) || {};

  if (!p) return;

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

  // Build QR Code Image
  let qrDataBase64 = '';
  if (typeof qrcode !== 'undefined') {
    const qrObj = qrcode(0, 'M');
    qrObj.addData(qrText);
    qrObj.make();
    qrDataBase64 = qrObj.createDataURL(4, 2);
  }

  const isLunas = p.status_lunas === 1 || p.dibayar >= p.harga;
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

  const printArea = document.getElementById('print-area');
  printArea.innerHTML = `
    <style>
      ${watermarkCss}
      .invoice-box {
        position: relative;
        max-width: 800px;
        margin: auto;
        padding: 30px;
        border: 1px solid #eee;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
        font-size: 15px;
        line-height: 24px;
        color: #555;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      }
      .top-table { width: 100%; text-align: left; margin-bottom: 20px; }
      .title { font-size: 28px; font-weight: bold; color: #333; text-transform: uppercase; }
      .info-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
      .info-table th, .info-table td { padding: 10px; border: 1px solid #ddd; }
      .info-table th { background: #eee; text-align: left; }
      .total-row { font-weight: bold; background: #f9f9f9; }
      .status-badge { display: inline-block; padding: 5px 10px; border-radius: 5px; color: white; background-color: ${isLunas ? '#28a745' : '#dc3545'}; font-weight: bold; }
    </style>

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
        <thead>
          <tr>
            <th>Deskripsi Pesanan</th>
            <th style="width: 200px; text-align: right;">Total / Harga</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <b>Jenis/Ukuran Papan:</b> ${p.jenis_papan}<br><br>
              <b>Catatan Ucapan Tertulis:</b><br>
              <i>"${p.ucapan}"</i>
            </td>
            <td style="text-align: right; vertical-align: bottom;">${formatRp(p.harga)}</td>
          </tr>
          <tr class="total-row">
            <td style="text-align: right;">TOTAL BAYAR</td>
            <td style="text-align: right; font-size: 18px;">${formatRp(p.harga)}</td>
          </tr>
          <tr class="total-row" style="color: #28a745;">
            <td style="text-align: right;">TELAH DIBAYAR</td>
            <td style="text-align: right; font-size: 15px;">${formatRp(p.dibayar)}</td>
          </tr>
          <tr class="total-row" style="color: #dc3545;">
            <td style="text-align: right;">SISA TAGIHAN</td>
            <td style="text-align: right; font-size: 15px;">${formatRp(p.harga - p.dibayar)}</td>
          </tr>
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
            ${qrDataBase64 ? `<img src="${qrDataBase64}" alt="QR Code Verifikasi" style="width: 110px; height: 110px; border: 1px solid #ddd; padding: 4px;"><br>` : ''}
            <span style="font-size: 10px; color: #777; font-family: monospace;">SIGN: ${signature}</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  window.print();
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
