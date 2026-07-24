// Dashboard Module
async function renderDashboardModule() {
  const container = document.getElementById('view-dashboard');
  if (!container) return;

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  const allPesanan = await db.pesanan.toArray();
  const allKeuangan = await db.keuangan.toArray();

  // Hitung Omset Bulan Ini & Total Pesanan
  let omsetBulanIni = 0;
  let totalPesananBulanIni = 0;
  
  allPesanan.forEach(p => {
    if (p.tanggal && p.tanggal.startsWith(currentMonthStr)) {
      omsetBulanIni += (p.harga || 0);
      totalPesananBulanIni += 1;
    }
  });

  // Hitung Kas Masuk & Kas Keluar & Saldo Kas
  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  allKeuangan.forEach(k => {
    if (k.jenis_transaksi === 'Pemasukan') {
      totalPemasukan += (k.nominal || 0);
    } else if (k.jenis_transaksi === 'Pengeluaran') {
      totalPengeluaran += (k.nominal || 0);
    }
  });
  const saldoKas = totalPemasukan - totalPengeluaran;

  // Hitung Total Hutang Pelanggan
  const rekapHutang = await dbGetRekapHutangPelanggan();
  const totalHutang = rekapHutang.reduce((acc, h) => acc + h.total_hutang, 0);

  // Pesanan Hari Ini yang Harus Diantar (Alert)
  const pesananHariIni = allPesanan.filter(p => p.tanggal_antar === todayStr && p.status_proses !== 'Papan Di Antar');

  // Format Rupiah Helper
  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  let html = `
    <!-- Header Banner / Notification Alert -->
    ${pesananHariIni.length > 0 ? `
      <div class="alert-banner">
        <div>
          <strong>📢 PENGINGAT PENGANTARAN HARI INI!</strong>
          <p style="font-size:0.85rem; margin-top:0.25rem;">Ada <b>${pesananHariIni.length} pesanan</b> yang harus diantar hari ini. Segera siapkan armada!</p>
        </div>
        <button class="btn btn-warning btn-sm" onclick="switchView('jadwal')">Lihat Jadwal</button>
      </div>
    ` : ''}

    <!-- Stat Widgets -->
    <div class="grid-stats">
      <div class="stat-card">
        <div class="stat-icon blue">📦</div>
        <div class="stat-info">
          <div class="label">Pesanan Bulan Ini</div>
          <div class="value">${totalPesananBulanIni} Papan</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">💰</div>
        <div class="stat-info">
          <div class="label">Omset Bulan Ini</div>
          <div class="value">${formatRp(omsetBulanIni)}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">💵</div>
        <div class="stat-info">
          <div class="label">Saldo Kas Utama</div>
          <div class="value">${formatRp(saldoKas)}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">⚠️</div>
        <div class="stat-info">
          <div class="label">Sisa Piutang/Hutang</div>
          <div class="value">${formatRp(totalHutang)}</div>
        </div>
      </div>
    </div>

    <!-- Quick Action Bar -->
    <div style="margin-bottom: 1.5rem; display:flex; gap:0.75rem; flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="openPesananModal()"><span class="icon">➕</span> Tambah Pesanan Baru</button>
      <button class="btn btn-secondary" onclick="openKeuanganModal()"><span class="icon">💸</span> Catat Transaksi Kas</button>
    </div>

    <!-- Recent Orders Table & Charts Grid -->
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem;">
      <div class="card" style="margin-bottom:0;">
        <div class="card-header">
          <div class="card-title">📦 Pesanan Terbaru</div>
          <button class="btn btn-secondary btn-sm" onclick="switchView('pesanan')">Lihat Semua</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Pemesan</th>
                <th>Jenis</th>
                <th>Tanggal Antar</th>
                <th>Status Bayar</th>
              </tr>
            </thead>
            <tbody>
              ${allPesanan.slice(-5).reverse().map(p => `
                <tr>
                  <td><b>${p.nama_pemesan || '-'}</b><br><small style="color:var(--text-muted);">${p.no_nota || ''}</small></td>
                  <td>${p.jenis_papan || '-'}</td>
                  <td>${p.tanggal_antar || p.tanggal || '-'}</td>
                  <td>
                    ${p.status_lunas ? '<span class="badge badge-lunas">LUNAS</span>' : '<span class="badge badge-belum">BELUM LUNAS</span>'}
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Belum ada data pesanan</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-bottom:0;">
        <div class="card-header">
          <div class="card-title">📊 Visualisasi Kas</div>
        </div>
        <div style="height: 250px; position:relative;">
          <canvas id="dashboardChart"></canvas>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Render Chart.js
  setTimeout(() => {
    const ctx = document.getElementById('dashboardChart');
    if (ctx && typeof Chart !== 'undefined') {
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Total Pemasukan', 'Total Pengeluaran'],
          datasets: [{
            data: [totalPemasukan, totalPengeluaran],
            backgroundColor: ['#10b981', '#ef4444'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#f8fafc' } }
          }
        }
      });
    }
  }, 100);
}
