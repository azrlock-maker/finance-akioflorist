// Hutang / Piutang Pelanggan Module

async function renderHutangModule() {
  const container = document.getElementById('view-hutang');
  if (!container) return;

  const rekap = await dbGetRekapHutangPelanggan();
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
              <th>Jumlah Order Menunggak</th>
              <th>Sejak Tanggal</th>
              <th>Total Sisa Hutang</th>
              <th style="text-align:right;">Aksi Pelunasan</th>
            </tr>
          </thead>
          <tbody>
            ${rekap.length > 0 ? rekap.map(h => `
              <tr>
                <td><b>${h.nama}</b></td>
                <td><span class="badge badge-belum">${h.total_tunggakan} Pesanan</span></td>
                <td><small style="color:var(--text-muted);">${h.tgl_awal || '-'}</small></td>
                <td><b style="color:var(--danger); font-size:1rem;">${formatRp(h.total_hutang)}</b></td>
                <td style="text-align:right;">
                  <button class="btn btn-success btn-sm" onclick="handleBayarLunasPelanggan('${h.nama.replace(/'/g, "\\'")}')">
                    ✔ Pelunasan Total
                  </button>
                </td>
              </tr>
            `).join('') : `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">🎉 Selamat! Tidak ada penunggakan hutang pelanggan saat ini.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

async function handleBayarLunasPelanggan(namaPelanggan) {
  if (confirm(`Lunaskan SELURUH tunggakan pesanan untuk pelanggan "${namaPelanggan}"? Pelunasan akan dimasukkan ke Keuangan Kas.`)) {
    await dbBayarLunasPelanggan(namaPelanggan);
    renderHutangModule();
    if (typeof renderDashboardModule === 'function') renderDashboardModule();
    if (typeof renderPesananModule === 'function') renderPesananModule();
  }
}
