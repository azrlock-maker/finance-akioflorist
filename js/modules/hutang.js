// Hutang / Piutang Pelanggan Module (With Days Counter, Cicilan & Nota Gabungan)

function calculateHariTunggak(tglAwalStr) {
  if (!tglAwalStr) return 0;
  try {
    const tglAwal = new Date(tglAwalStr);
    const now = new Date();
    const diffTime = now - tglAwal;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch (e) {
    return 0;
  }
}

async function renderHutangModule() {
  const container = document.getElementById('view-hutang');
  if (!container) return;

  let rekap = await dbGetRekapHutangPelanggan();

  // Urutkan berdasarkan pelanggan yang paling lama menunggak (hari_tunggak terbesar)
  rekap.forEach(h => {
    h.hari_tunggak = calculateHariTunggak(h.tgl_awal);
  });
  rekap.sort((a, b) => b.hari_tunggak - a.hari_tunggak);

  const totalHutangKeseluruhan = rekap.reduce((acc, h) => acc + h.total_hutang, 0);
  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

  let html = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">⚠️ Rekap Sisa Hutang & Piutang Pelanggan</div>
        <div style="font-size:1.1rem; font-weight:700; color:var(--danger);">
          Total Piutang: ${formatRp(totalHutangKeseluruhan)}
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nama Pelanggan</th>
              <th>Tunggakan</th>
              <th>Menunggak Sejak</th>
              <th>Lama Menunggak</th>
              <th>Total Sisa Hutang</th>
              <th style="text-align:right;">Aksi Pelunasan & Nota</th>
            </tr>
          </thead>
          <tbody>
            ${rekap.length > 0 ? rekap.map(h => `
              <tr>
                <td><b>${h.nama}</b></td>
                <td><span class="badge badge-belum">${h.total_tunggakan} Pesanan</span></td>
                <td><small style="color:var(--text-muted);">${h.tgl_awal || '-'}</small></td>
                <td>
                  <span class="badge ${h.hari_tunggak > 30 ? 'badge-belum' : 'badge-siap'}">
                    ⏳ ${h.hari_tunggak} Hari
                  </span>
                </td>
                <td><b style="color:var(--danger); font-size:1rem;">${formatRp(h.total_hutang)}</b></td>
                <td style="text-align:right;">
                  <div style="display:inline-flex; gap:0.35rem; flex-wrap:wrap; justify-content:flex-end;">
                    <button class="btn btn-warning btn-sm" onclick="handleBayarCicilanPelanggan('${h.nama.replace(/'/g, "\\'")}', ${h.total_hutang})">
                      💰 Cicil
                    </button>
                    <button class="btn btn-success btn-sm" onclick="handleBayarLunasPelanggan('${h.nama.replace(/'/g, "\\'")}')">
                      ✅ Bayar Lunas
                    </button>
                    <button class="btn btn-secondary btn-sm" title="Kwitansi Nota Gabungan" onclick="printNotaGabungan('${h.nama.replace(/'/g, "\\'")}')">
                      🧾 Nota Gabungan
                    </button>
                  </div>
                </td>
              </tr>
            `).join('') : `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">🎉 Selamat! Tidak ada penunggakan hutang pelanggan saat ini.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// Handler Bayar Cicilan Pelanggan
async function handleBayarCicilanPelanggan(namaPelanggan, totalHutang) {
  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  const inputVal = prompt(`Masukkan Jumlah Pembayaran Cicilan (Rp) untuk "${namaPelanggan}":\n(Total Sisa Hutang: ${formatRp(totalHutang)})`, "");

  if (inputVal !== null && inputVal.trim() !== '') {
    const jumlah = parseFloat(inputVal.replace(/\./g, '').replace(/,/g, ''));
    if (isNaN(jumlah) || jumlah <= 0) {
      alert('Jumlah pembayaran cicilan tidak valid!');
      return;
    }

    await dbBayarSebagianPelanggan(namaPelanggan, jumlah);
    alert(`✅ Pembayaran cicilan sebesar ${formatRp(jumlah)} untuk ${namaPelanggan} berhasil dicatat!`);
    renderHutangModule();
    if (typeof renderDashboardModule === 'function') renderDashboardModule();
    if (typeof renderPesananModule === 'function') renderPesananModule();
  }
}

// Handler Bayar Lunas Total Pelanggan
async function handleBayarLunasPelanggan(namaPelanggan) {
  if (confirm(`Lunaskan SELURUH tunggakan pesanan untuk pelanggan "${namaPelanggan}"? Pelunasan akan dimasukkan ke Keuangan Kas.`)) {
    await dbBayarLunasPelanggan(namaPelanggan);
    renderHutangModule();
    if (typeof renderDashboardModule === 'function') renderDashboardModule();
    if (typeof renderPesananModule === 'function') renderPesananModule();
  }
}

// Handler Cetak Nota Gabungan Hutang Pelanggan
async function printNotaGabungan(namaPelanggan) {
  const targetNama = (namaPelanggan || '').trim().toUpperCase();
  const allPesanan = await db.pesanan.toArray();
  const unpaid = allPesanan.filter(p => (p.nama_pemesan || '').trim().toUpperCase() === targetNama && (p.dibayar || 0) < (p.harga || 0));

  if (unpaid.length === 0) {
    alert(`Pelanggan "${namaPelanggan}" tidak memiliki pesanan yang menunggak!`);
    return;
  }

  const config = await db.pengaturan.get(1) || {};
  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

  const totalHargaSemua = unpaid.reduce((acc, p) => acc + (p.harga || 0), 0);
  const totalDibayarSemua = unpaid.reduce((acc, p) => acc + (p.dibayar || 0), 0);
  const totalSisaHutang = totalHargaSemua - totalDibayarSemua;

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate HMAC Digital Signature
  const signature = await generateInvoiceDigitalSignature('GABUNGAN', todayStr, targetNama, totalSisaHutang);

  // Generate QR Code
  let targetUrl = config.website_url ? config.website_url.trim() : (window.location.origin + window.location.pathname);
  if (targetUrl && !targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

  const qrUrlParams = new URLSearchParams({
    nota: `GABUNGAN - ${targetNama}`,
    tgl: todayStr,
    total: totalSisaHutang,
    sign: signature
  });
  const qrText = targetUrl.includes('?') ? `${targetUrl}&${qrUrlParams.toString()}` : `${targetUrl}?${qrUrlParams.toString()}`;

  let qrDataBase64 = '';
  if (typeof qrcode !== 'undefined') {
    const qrObj = qrcode(0, 'M');
    qrObj.addData(qrText);
    qrObj.make();
    qrDataBase64 = qrObj.createDataURL(4, 2);
  }

  const logoHtml = config.logo_path ? `<img src="${config.logo_path}" alt="Logo Toko" style="max-height: 80px; max-width: 100px; margin-right: 15px;">` : '';

  const printArea = document.getElementById('print-area');
  printArea.innerHTML = `
    <style>
      .invoice-box {
        position: relative;
        max-width: 800px;
        margin: auto;
        padding: 30px;
        border: 1px solid #eee;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
        font-size: 14px;
        line-height: 22px;
        color: #555;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      }
      .top-table { width: 100%; text-align: left; margin-bottom: 20px; }
      .title { font-size: 28px; font-weight: bold; color: #333; text-transform: uppercase; }
      .info-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
      .info-table th, .info-table td { padding: 8px 10px; border: 1px solid #ddd; }
      .info-table th { background: #eee; text-align: left; }
      .total-row { font-weight: bold; background: #f9f9f9; }
    </style>

    <div class="invoice-box">
      <table class="top-table">
        <tr>
          ${logoHtml ? `<td style="width: 15%; vertical-align: top;">${logoHtml}</td>` : ''}
          <td class="title" style="width: ${logoHtml ? '50%' : '65%'}; vertical-align: top;">
            <span style="font-size: 30px; color: #000; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">${config.nama_toko || 'AKIO FLORIST'}</span><br>
            <span style="font-size: 13px; font-weight: normal; color: #7f8c8d; letter-spacing: 2px;">${config.tagline || 'SPECIALIST PAPAN BUNGA'}</span><br>
            <span style="font-size: 11px; font-weight: normal; color: #555;">${config.alamat || ''} ${config.telepon ? '| WA: ' + config.telepon : ''}</span><br><br>
            <span style="font-size: 17px; text-decoration: underline; color:#dc3545;">REKAP NOTA GABUNGAN TAGIHAN</span>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <b>Jenis:</b> NOTA GABUNGAN<br>
            <b>Tanggal:</b> ${todayStr}<br>
            <b>Pelanggan:</b> <span style="font-size:16px; font-weight:bold; color:#000;">${targetNama}</span>
          </td>
        </tr>
      </table>
      <hr style="border: 0; border-top: 1px solid #eee;">
      
      <p style="margin-top:10px;">Daftar rincian pesanan papan bunga yang belum dilunasi:</p>

      <table class="info-table">
        <thead>
          <tr>
            <th>No. Nota</th>
            <th>Tgl Antar / Pesan</th>
            <th>Jenis & Ucapan</th>
            <th style="text-align:right;">Harga</th>
            <th style="text-align:right;">Telah Dibayar</th>
            <th style="text-align:right;">Sisa Tagihan</th>
          </tr>
        </thead>
        <tbody>
          ${unpaid.map(p => `
            <tr>
              <td><b>${p.no_nota || '-'}</b></td>
              <td>${p.tanggal_antar || p.tanggal || '-'}</td>
              <td>
                <b>${p.jenis_papan}</b><br>
                <small style="color:#666;">"${p.ucapan}"</small>
              </td>
              <td style="text-align:right;">${formatRp(p.harga)}</td>
              <td style="text-align:right; color:#28a745;">${formatRp(p.dibayar)}</td>
              <td style="text-align:right; color:#dc3545;"><b>${formatRp(p.harga - p.dibayar)}</b></td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3" style="text-align:right;">TOTAL HARGA PESANAN</td>
            <td colspan="3" style="text-align:right; font-size:15px;">${formatRp(totalHargaSemua)}</td>
          </tr>
          <tr class="total-row" style="color:#28a745;">
            <td colspan="3" style="text-align:right;">TOTAL DIBAYAR / DP</td>
            <td colspan="3" style="text-align:right; font-size:15px;">${formatRp(totalDibayarSemua)}</td>
          </tr>
          <tr class="total-row" style="color:#dc3545; background:#fff0f0;">
            <td colspan="3" style="text-align:right; font-size:16px;">TOTAL SISA TAGIHAN GABUNGAN</td>
            <td colspan="3" style="text-align:right; font-size:18px; font-weight:bold;">${formatRp(totalSisaHutang)}</td>
          </tr>
        </tbody>
      </table>

      <table style="width: 100%; margin-top: 40px;">
        <tr>
          <td style="width: 70%; text-align: left; color: #777; vertical-align: top;">
            <p>Silakan lakukan pelunasan tagihan ke pihak <b>${config.nama_toko || 'AKIO FLORIST'}</b>.</p>
            <p style="font-size: 11px; margin-top: 15px;">
              * Rekap Nota Gabungan ini dicetak secara resmi.<br>
              Silakan <i>scan</i> QR Code di samping untuk verifikasi keaslian tagihan.
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
