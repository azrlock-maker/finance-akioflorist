// Laporan & Statistik Module (Line Chart & Exact Desktop Logic)

let laporanSelectedYear = String(new Date().getFullYear());
let laporanSelectedMonth = 'Semua';
let laporanSelectedMode = 'Laba Bersih'; // 'Laba Bersih' atau 'Jumlah Order'

const lapMonthMapping = {
  "Semua": "Semua",
  "Januari": "01", "Februari": "02", "Maret": "03", "April": "04",
  "Mei": "05", "Juni": "06", "Juli": "07", "Agustus": "08",
  "September": "09", "Oktober": "10", "November": "11", "Desember": "12"
};

async function renderLaporanModule() {
  const container = document.getElementById('view-laporan');
  if (!container) return;

  const allPesanan = await db.pesanan.toArray();
  const allKeuangan = await db.keuangan.toArray();
  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

  const bulanAngka = lapMonthMapping[laporanSelectedMonth];
  const likePattern = (bulanAngka === 'Semua') ? `${laporanSelectedYear}-` : `${laporanSelectedYear}-${bulanAngka}-`;

  // 1. Total Omset (Nota) = SUM(harga) dari pesanan
  let omsetTotal = 0;
  allPesanan.forEach(p => {
    if (p.tanggal && p.tanggal.startsWith(likePattern)) {
      omsetTotal += (p.harga || 0);
    }
  });

  // 2. Total Uang Masuk = SUM(nominal) Pemasukan
  let uangMasukTotal = 0;
  allKeuangan.forEach(k => {
    if (k.jenis_transaksi === 'Pemasukan' && k.tanggal && k.tanggal.startsWith(likePattern)) {
      uangMasukTotal += (k.nominal || 0);
    }
  });

  // 3. Total Pengeluaran = SUM(nominal) Pengeluaran
  let pengeluaranTotal = 0;
  allKeuangan.forEach(k => {
    if (k.jenis_transaksi === 'Pengeluaran' && k.tanggal && k.tanggal.startsWith(likePattern)) {
      pengeluaranTotal += (k.nominal || 0);
    }
  });

  // 4. Laba Bersih
  const labaBersihTotal = uangMasukTotal - pengeluaranTotal;

  // Prepare Line Chart Data
  let chartLabels = [];
  let chartValues = [];

  if (bulanAngka === 'Semua') {
    // 12 Bulan (Jan - Des)
    const monthShorts = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    chartLabels = monthShorts;
    
    for (let m = 1; m <= 12; m++) {
      const mStr = `${laporanSelectedYear}-${String(m).padStart(2, '0')}-`;
      if (laporanSelectedMode === 'Laba Bersih') {
        let pMasuk = 0;
        let pKeluar = 0;
        allKeuangan.forEach(k => {
          if (k.tanggal && k.tanggal.startsWith(mStr)) {
            if (k.jenis_transaksi === 'Pemasukan') pMasuk += (k.nominal || 0);
            if (k.jenis_transaksi === 'Pengeluaran') pKeluar += (k.nominal || 0);
          }
        });
        chartValues.push(pMasuk - pKeluar);
      } else { // Mode Jumlah Order
        const orderCount = allPesanan.filter(p => p.tanggal && p.tanggal.startsWith(mStr)).length;
        chartValues.push(orderCount);
      }
    }
  } else {
    // Breakdown Harian (Hari yang ada transaksinya)
    const dayMap = {};
    if (laporanSelectedMode === 'Laba Bersih') {
      allKeuangan.forEach(k => {
        if (k.tanggal && k.tanggal.startsWith(likePattern)) {
          const day = k.tanggal.substring(8, 10);
          if (!dayMap[day]) dayMap[day] = { masuk: 0, keluar: 0 };
          if (k.jenis_transaksi === 'Pemasukan') dayMap[day].masuk += (k.nominal || 0);
          if (k.jenis_transaksi === 'Pengeluaran') dayMap[day].keluar += (k.nominal || 0);
        }
      });
      const sortedDays = Object.keys(dayMap).sort();
      chartLabels = sortedDays.map(d => `Tgl ${d}`);
      chartValues = sortedDays.map(d => dayMap[d].masuk - dayMap[d].keluar);
    } else { // Mode Jumlah Order
      allPesanan.forEach(p => {
        if (p.tanggal && p.tanggal.startsWith(likePattern)) {
          const day = p.tanggal.substring(8, 10);
          if (!dayMap[day]) dayMap[day] = 0;
          dayMap[day] += 1;
        }
      });
      const sortedDays = Object.keys(dayMap).sort();
      chartLabels = sortedDays.map(d => `Tgl ${d}`);
      chartValues = sortedDays.map(d => dayMap[d]);
    }
  }

  let html = `
    <!-- Top Bar & Filters -->
    <div class="card" style="margin-bottom: 1.25rem; padding: 1.25rem 1.5rem;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
        <div style="font-size:1.2rem; font-weight:700; display:flex; align-items:center; gap:0.5rem;">
          📈 LAPORAN & STATISTIK KEUANGAN
        </div>

        <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <label style="font-weight:600; font-size:0.85rem; color:var(--text-muted);">Tahun:</label>
          <select id="lap-filter-tahun" class="form-control" style="width:110px;" onchange="onLaporanFilterChange()">
            ${Array.from({length: 15}, (_, i) => 2020 + i).map(y => `
              <option value="${y}" ${String(y) === laporanSelectedYear ? 'selected' : ''}>${y}</option>
            `).join('')}
          </select>

          <label style="font-weight:600; font-size:0.85rem; color:var(--text-muted);">Bulan:</label>
          <select id="lap-filter-bulan" class="form-control" style="width:130px;" onchange="onLaporanFilterChange()">
            ${Object.keys(lapMonthMapping).map(m => `
              <option value="${m}" ${m === laporanSelectedMonth ? 'selected' : ''}>${m}</option>
            `).join('')}
          </select>

          <!-- Mode Switcher -->
          <div style="display:inline-flex; background:rgba(0,0,0,0.3); border-radius:8px; padding:3px;">
            <button class="btn btn-sm ${laporanSelectedMode === 'Laba Bersih' ? 'btn-primary' : 'btn-secondary'}" onclick="setLaporanMode('Laba Bersih')">Laba Bersih</button>
            <button class="btn btn-sm ${laporanSelectedMode === 'Jumlah Order' ? 'btn-primary' : 'btn-secondary'}" onclick="setLaporanMode('Jumlah Order')">Jumlah Order</button>
          </div>

          <button class="btn btn-success btn-sm" onclick="exportDataCSV()">📊 Export CSV</button>
        </div>
      </div>
    </div>

    <!-- 4 Summary Cards -->
    <div class="grid-stats" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
      <div class="stat-card">
        <div class="stat-icon blue">📜</div>
        <div class="stat-info">
          <div class="label">Total Omset (Nota)</div>
          <div class="value">${formatRp(omsetTotal)}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">📥</div>
        <div class="stat-info">
          <div class="label">Total Uang Masuk</div>
          <div class="value">${formatRp(uangMasukTotal)}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon red">📤</div>
        <div class="stat-info">
          <div class="label">Total Pengeluaran</div>
          <div class="value">${formatRp(pengeluaranTotal)}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon amber">💎</div>
        <div class="stat-info">
          <div class="label">Laba Bersih</div>
          <div class="value" style="color:${labaBersihTotal >= 0 ? '#34d399' : '#f87171'};">${formatRp(labaBersihTotal)}</div>
        </div>
      </div>
    </div>

    <!-- Line Chart Grafik Section -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">📈 Grafik Line / Garis ${laporanSelectedMode} (${laporanSelectedMonth} ${laporanSelectedYear})</div>
      </div>
      <div style="height: 320px; position:relative;">
        <canvas id="laporanBarChart"></canvas>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Render Line Chart via Chart.js
  setTimeout(() => {
    const ctx = document.getElementById('laporanBarChart');
    if (ctx && typeof Chart !== 'undefined') {
      const lineColor = laporanSelectedMode === 'Jumlah Order' ? '#3b82f6' : '#10b981';
      const bgGradientColor = laporanSelectedMode === 'Jumlah Order' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)';

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartLabels.length > 0 ? chartLabels : ['Belum Ada Data'],
          datasets: [{
            label: laporanSelectedMode,
            data: chartValues.length > 0 ? chartValues : [0],
            borderColor: lineColor,
            backgroundColor: bgGradientColor,
            borderWidth: 3,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: lineColor,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }
  }, 100);
}

function onLaporanFilterChange() {
  const y = document.getElementById('lap-filter-tahun');
  const m = document.getElementById('lap-filter-bulan');
  if (y) laporanSelectedYear = y.value;
  if (m) laporanSelectedMonth = m.value;
  renderLaporanModule();
}

function setLaporanMode(mode) {
  laporanSelectedMode = mode;
  renderLaporanModule();
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
