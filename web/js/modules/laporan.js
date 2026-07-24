// Laporan & Rekap Statistik Module

async function renderLaporanModule() {
  const container = document.getElementById('view-laporan');
  if (!container) return;

  const allPesanan = await db.pesanan.toArray();
  const allKeuangan = await db.keuangan.toArray();
  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

  // Group by Month (YYYY-MM)
  const monthMap = {};

  allPesanan.forEach(p => {
    const m = p.tanggal ? p.tanggal.substring(0, 7) : 'Lainnya';
    if (!monthMap[m]) monthMap[m] = { pesananCount: 0, omset: 0, lunasCount: 0 };
    monthMap[m].pesananCount += 1;
    monthMap[m].omset += (p.harga || 0);
    if (p.status_lunas) monthMap[m].lunasCount += 1;
  });

  const sortedMonths = Object.keys(monthMap).sort().reverse();

  let html = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">📈 Laporan Rekap Bulanan</div>
        <button class="btn btn-secondary" onclick="exportDataCSV()"><span class="icon">📥</span> Export Rekap CSV</button>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Bulan (Tahun-Bulan)</th>
              <th>Jumlah Order Papan</th>
              <th>Pesanan Lunas</th>
              <th>Total Omset Penjualan</th>
            </tr>
          </thead>
          <tbody>
            ${sortedMonths.length > 0 ? sortedMonths.map(m => `
              <tr>
                <td><b>${m}</b></td>
                <td><b>${monthMap[m].pesananCount} Papan</b></td>
                <td><span class="badge badge-lunas">${monthMap[m].lunasCount} Lunas</span></td>
                <td><b style="color:var(--success); font-size:1rem;">${formatRp(monthMap[m].omset)}</b></td>
              </tr>
            `).join('') : `<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">Belum ada riwayat pesanan.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// Helper Export Data CSV
async function exportDataCSV() {
  const pesanan = await db.pesanan.toArray();
  let csv = 'No Nota,Tanggal,Pemesan,Jenis Papan,Harga,Dibayar,Status Lunas,Lokasi\n';

  pesanan.forEach(p => {
    csv += `"${p.no_nota || ''}","${p.tanggal || ''}","${(p.nama_pemesan || '').replace(/"/g, '""')}","${p.jenis_papan || ''}",${p.harga || 0},${p.dibayar || 0},"${p.status_lunas ? 'LUNAS' : 'BELUM'}","${(p.lokasi_pengantaran || '').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `rekap_pesanan_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
