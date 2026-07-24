// Dashboard & Statistik Module (Clean Layout Without Recent Orders Table)

let dashboardSelectedMonth = String(new Date().getMonth() + 1).padStart(2, '0');
let dashboardSelectedYear = String(new Date().getFullYear());

const monthNamesMap = {
  "01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
  "05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
  "09": "September", "10": "Oktober", "11": "November", "12": "Desember"
};

async function renderDashboardModule() {
  const container = document.getElementById('view-dashboard');
  if (!container) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const allPesanan = await db.pesanan.toArray();
  const allKeuangan = await db.keuangan.toArray();

  const monthPattern = `${dashboardSelectedYear}-${dashboardSelectedMonth}`;
  const yearPattern = `${dashboardSelectedYear}`;

  // 1. Total Papan Bulan Ini
  const totalPapanBulan = allPesanan.filter(p => p.tanggal && p.tanggal.startsWith(monthPattern)).length;

  // 2. Total Papan Tahun Ini
  const totalPapanTahun = allPesanan.filter(p => p.tanggal && p.tanggal.startsWith(yearPattern)).length;

  // 3. Total Pemasukan Bulan Ini
  let totalPemasukanBulan = 0;
  allKeuangan.forEach(k => {
    if (k.jenis_transaksi === 'Pemasukan' && k.tanggal && k.tanggal.startsWith(monthPattern)) {
      totalPemasukanBulan += (k.nominal || 0);
    }
  });

  // 4. Total Pengeluaran Bulan Ini
  let totalPengeluaranBulan = 0;
  allKeuangan.forEach(k => {
    if (k.jenis_transaksi === 'Pengeluaran' && k.tanggal && k.tanggal.startsWith(monthPattern)) {
      totalPengeluaranBulan += (k.nominal || 0);
    }
  });

  // 5. Keuntungan Bersih
  const keuntunganBersih = totalPemasukanBulan - totalPengeluaranBulan;

  // 6. Total Sisa Hutang Keseluruhan (Piutang Pelanggan)
  let totalSisaHutangKeseluruhan = 0;
  allPesanan.forEach(p => {
    const h = p.harga || 0;
    const d = p.dibayar || 0;
    if (d < h) {
      totalSisaHutangKeseluruhan += (h - d);
    }
  });

  // Pesanan Hari Ini yang Harus Diantar (Alert)
  const pesananHariIni = allPesanan.filter(p => p.tanggal_antar === todayStr && p.status_proses !== 'Papan Di Antar');

  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

  let html = `
    <!-- Header Banner / Notification Alert -->
    ${pesananHariIni.length > 0 ? `
      <div class="alert-banner">
        <div>
          <strong>📢 PERINGATAN PENGANTARAN HARI INI!</strong>
          <p style="font-size:0.85rem; margin-top:0.25rem;">Ada <b>${pesananHariIni.length} pesanan</b> yang harus diantar hari ini. Segera siapkan armada!</p>
        </div>
        <button class="btn btn-warning btn-sm" onclick="switchView('jadwal')">Lihat Jadwal Armada</button>
      </div>
    ` : ''}

    <!-- Top Filter Frame -->
    <div class="card" style="margin-bottom: 1.25rem; padding: 1rem 1.5rem;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
        <div style="font-size:1.1rem; font-weight:700;">📊 Dashboard & Statistik Overview</div>
        <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <label style="font-weight:600; font-size:0.85rem; color:var(--text-muted);">Bulan:</label>
          <select id="dash-filter-bulan" class="form-control" style="width:130px;" onchange="onDashboardFilterChange()">
            ${Object.keys(monthNamesMap).map(m => `
              <option value="${m}" ${m === dashboardSelectedMonth ? 'selected' : ''}>${monthNamesMap[m]}</option>
            `).join('')}
          </select>

          <label style="font-weight:600; font-size:0.85rem; color:var(--text-muted);">Tahun:</label>
          <select id="dash-filter-tahun" class="form-control" style="width:110px;" onchange="onDashboardFilterChange()">
            ${Array.from({length: 15}, (_, i) => 2020 + i).map(y => `
              <option value="${y}" ${String(y) === dashboardSelectedYear ? 'selected' : ''}>${y}</option>
            `).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- 6 Summary Cards -->
    <div class="grid-stats" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
      <div class="stat-card">
        <div class="stat-icon blue">📦</div>
        <div class="stat-info">
          <div class="label">Total Papan (Bulan Ini)</div>
          <div class="value">${totalPapanBulan} Papan</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">🏆</div>
        <div class="stat-info">
          <div class="label">Total Papan (Tahun Ini)</div>
          <div class="value">${totalPapanTahun} Papan</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon amber">⚖️</div>
        <div class="stat-info">
          <div class="label">Keuntungan Bersih</div>
          <div class="value" style="color:${keuntunganBersih >= 0 ? '#34d399' : '#f87171'};">${formatRp(keuntunganBersih)}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">📥</div>
        <div class="stat-info">
          <div class="label">Pemasukan (Bulan Ini)</div>
          <div class="value">${formatRp(totalPemasukanBulan)}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon red">📤</div>
        <div class="stat-info">
          <div class="label">Pengeluaran (Bulan Ini)</div>
          <div class="value">${formatRp(totalPengeluaranBulan)}</div>
        </div>
      </div>

      <div class="stat-card" style="cursor:pointer;" title="Klik untuk lihat rincian sisa hutang" onclick="switchView('hutang')">
        <div class="stat-icon purple">⚠️</div>
        <div class="stat-info">
          <div class="label">Total Sisa Hutang</div>
          <div class="value" style="color:var(--danger);">${formatRp(totalSisaHutangKeseluruhan)}</div>
        </div>
      </div>
    </div>

    <!-- Quick Action Bar -->
    <div style="margin-bottom: 1.5rem; display:flex; gap:0.75rem; flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="openPesananModal()"><span class="icon">➕</span> Tambah Pesanan Baru</button>
      <button class="btn btn-secondary" onclick="openKeuanganModal()"><span class="icon">💸</span> Catat Transaksi Kas</button>
      <button class="btn btn-secondary" onclick="switchView('hutang')"><span class="icon">⚠️</span> Rekap Sisa Hutang</button>
    </div>

    <!-- Clean Pie Chart Section (Without Pesanan Terbaru) -->
    <div class="card" style="margin-bottom:0;">
      <div class="card-header">
        <div class="card-title">🥧 Distribusi Operasional Keuangan (${monthNamesMap[dashboardSelectedMonth]} ${dashboardSelectedYear})</div>
      </div>
      <div style="height: 300px; position:relative; max-width:600px; margin:0 auto;">
        <canvas id="dashboardChart"></canvas>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Render Chart.js Pie Chart
  setTimeout(() => {
    const ctx = document.getElementById('dashboardChart');
    if (ctx && typeof Chart !== 'undefined') {
      let labels = ['Keuntungan', 'Pengeluaran'];
      let chartData = [Math.max(0, keuntunganBersih), totalPengeluaranBulan];
      let bgColors = ['#10b981', '#ef4444'];

      if (totalPengeluaranBulan > totalPemasukanBulan) {
        labels = ['Pemasukan', 'Defisit/Rugi'];
        chartData = [totalPemasukanBulan, totalPengeluaranBulan - totalPemasukanBulan];
        bgColors = ['#3b82f6', '#ef4444'];
      } else if (totalPemasukanBulan === 0 && totalPengeluaranBulan === 0) {
        labels = ['Belum Ada Data'];
        chartData = [1];
        bgColors = ['#64748b'];
      }

      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: chartData,
            backgroundColor: bgColors,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#f8fafc', font: { size: 14 } } }
          }
        }
      });
    }
  }, 100);
}

function onDashboardFilterChange() {
  const m = document.getElementById('dash-filter-bulan');
  const y = document.getElementById('dash-filter-tahun');
  if (m) dashboardSelectedMonth = m.value;
  if (y) dashboardSelectedYear = y.value;
  renderDashboardModule();
}
