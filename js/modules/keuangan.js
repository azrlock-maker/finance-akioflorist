// Keuangan Kas Module dengan Pengelompokan & Filter Bulan

let selectedKeuanganBulan = 'ALL';

function getNamaBulanTahun(ym) {
  if (!ym || !ym.includes('-')) return ym || '-';
  const parts = ym.split('-');
  const y = parts[0];
  const m = parseInt(parts[1], 10);
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${monthNames[m - 1] || m} ${y}`;
}

function onFilterKeuanganBulan(val) {
  selectedKeuanganBulan = val;
  renderKeuanganModule();
}

async function renderKeuanganModule() {
  const container = document.getElementById('view-keuangan');
  if (!container) return;

  try {
    const allKeuangan = await db.keuangan.toArray();
    allKeuangan.sort((a, b) => {
      const tglA = String(a.tanggal || '');
      const tglB = String(b.tanggal || '');
      if (tglA !== tglB) return tglB.localeCompare(tglA);
      return (b.id || 0) - (a.id || 0);
    });

    // Ambil daftar unik bulan (YYYY-MM) dari data
    const monthKeysSet = new Set();
    allKeuangan.forEach(k => {
      if (k.tanggal && k.tanggal.length >= 7) {
        monthKeysSet.add(k.tanggal.substring(0, 7));
      }
    });
    const availableMonths = Array.from(monthKeysSet).sort((a, b) => b.localeCompare(a));

    // Filter transaksi berdasarkan bulan yang dipilih
    let filteredKeuangan = allKeuangan;
    if (selectedKeuanganBulan !== 'ALL') {
      filteredKeuangan = allKeuangan.filter(k => k.tanggal && k.tanggal.startsWith(selectedKeuanganBulan));
    }

    let totalMasuk = 0;
    let totalKeluar = 0;

    filteredKeuangan.forEach(k => {
      if (k.jenis_transaksi === 'Pemasukan') totalMasuk += (k.nominal || 0);
      if (k.jenis_transaksi === 'Pengeluaran') totalKeluar += (k.nominal || 0);
    });

    const saldo = totalMasuk - totalKeluar;
    const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

    // Pengelompokan berdasarkan Bulan (YYYY-MM)
    const groupedByMonth = {};
    filteredKeuangan.forEach(k => {
      const ym = (k.tanggal && k.tanggal.length >= 7) ? k.tanggal.substring(0, 7) : 'Lainnya';
      if (!groupedByMonth[ym]) groupedByMonth[ym] = [];
      groupedByMonth[ym].push(k);
    });

    const sortedGroupKeys = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

    let html = `
      <div class="grid-stats">
        <div class="stat-card">
          <div class="stat-icon green">📥</div>
          <div class="stat-info">
            <div class="label">Total Pemasukan Kas ${selectedKeuanganBulan !== 'ALL' ? `(${getNamaBulanTahun(selectedKeuanganBulan)})` : ''}</div>
            <div class="value">${formatRp(totalMasuk)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">📤</div>
          <div class="stat-info">
            <div class="label">Total Pengeluaran Kas ${selectedKeuanganBulan !== 'ALL' ? `(${getNamaBulanTahun(selectedKeuanganBulan)})` : ''}</div>
            <div class="value">${formatRp(totalKeluar)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">💰</div>
          <div class="stat-info">
            <div class="label">Saldo Kas Bersih</div>
            <div class="value">${formatRp(saldo)}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="flex-wrap:wrap; gap:0.75rem;">
          <div class="card-title">💵 Pencatatan Kas Operasional</div>
          <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
            <select class="form-control" style="width:auto; font-size:0.85rem;" onchange="onFilterKeuanganBulan(this.value)">
              <option value="ALL" ${selectedKeuanganBulan === 'ALL' ? 'selected' : ''}>📅 Semua Bulan</option>
              ${availableMonths.map(ym => `
                <option value="${ym}" ${selectedKeuanganBulan === ym ? 'selected' : ''}>
                  📅 ${getNamaBulanTahun(ym)}
                </option>
              `).join('')}
            </select>
            <button class="btn btn-primary" onclick="openKeuanganModal()"><span class="icon">➕</span> Tambah Transaksi</button>
          </div>
        </div>

        ${filteredKeuangan.length > 0 ? sortedGroupKeys.map(ym => {
          const list = groupedByMonth[ym];
          let mMasuk = 0;
          let mKeluar = 0;
          list.forEach(k => {
            if (k.jenis_transaksi === 'Pemasukan') mMasuk += (k.nominal || 0);
            if (k.jenis_transaksi === 'Pengeluaran') mKeluar += (k.nominal || 0);
          });
          const labelGroup = ym === 'Lainnya' ? 'Lainnya' : getNamaBulanTahun(ym);

          return `
            <div style="margin-top:1rem; margin-bottom:1.5rem; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem 1rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; margin-bottom:0.75rem;">
                <h3 style="margin:0; font-size:0.95rem; font-weight:700; color:var(--text-main);">
                  📌 Kelompok: ${labelGroup} (${list.length} transaksi)
                </h3>
                <div style="font-size:0.8rem; color:var(--text-muted);">
                  Masuk: <b style="color:var(--success);">${formatRp(mMasuk)}</b> | 
                  Keluar: <b style="color:var(--danger);">${formatRp(mKeluar)}</b>
                </div>
              </div>

              <!-- Tampilan Desktop (Tabel) -->
              <div class="table-responsive desktop-table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Jenis Transaksi</th>
                      <th>Keterangan</th>
                      <th>Nominal</th>
                      <th>Nota Terkait</th>
                      <th style="text-align:right;">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${list.map(k => `
                      <tr>
                        <td>${k.tanggal || '-'}</td>
                        <td>
                          ${k.jenis_transaksi === 'Pemasukan' ? 
                            '<span class="badge badge-lunas">PEMASUKAN</span>' : 
                            '<span class="badge badge-belum">PENGELUARAN</span>'}
                        </td>
                        <td><b>${k.keterangan || '-'}</b></td>
                        <td><b>${formatRp(k.nominal)}</b></td>
                        <td><small style="color:var(--text-muted);">${k.no_nota || '-'}</small></td>
                        <td style="text-align:right;">
                          <button class="btn btn-danger btn-sm" onclick="handleHapusKeuangan(${k.id})">🗑️ Hapus</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <!-- Tampilan Native Mobile Cards (Khusus HP) -->
              <div class="mobile-card-list">
                ${list.map(k => `
                  <div class="mobile-card-item">
                    <div class="mobile-card-header">
                      ${k.jenis_transaksi === 'Pemasukan' ? 
                        '<span class="badge badge-lunas">PEMASUKAN</span>' : 
                        '<span class="badge badge-belum">PENGELUARAN</span>'}
                      <small style="color:var(--text-muted);">📅 ${k.tanggal || '-'}</small>
                    </div>
                    <div class="mobile-card-body">
                      <div class="customer-name">${k.keterangan || '-'}</div>
                      ${k.no_nota ? `<div style="font-size:0.8rem; color:var(--text-muted);">Nota: ${k.no_nota}</div>` : ''}
                    </div>
                    <div class="mobile-card-meta">
                      <div>Nominal:</div>
                      <div><b style="font-size:1rem; color:${k.jenis_transaksi === 'Pemasukan' ? 'var(--success)' : 'var(--danger)'};">${formatRp(k.nominal)}</b></div>
                    </div>
                    <div class="mobile-card-actions">
                      <button class="btn btn-danger" style="width:100%;" onclick="handleHapusKeuangan(${k.id})">🗑️ Hapus Transaksi</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('') : `
          <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
            Belum ada riwayat transaksi kas ${selectedKeuanganBulan !== 'ALL' ? `pada bulan ${getNamaBulanTahun(selectedKeuanganBulan)}` : ''}.
          </div>
        `}
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    console.error('[Keuangan] Error rendering module:', err);
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">💵 Keuangan Kas Operasional</div>
        </div>
        <div style="padding: 2rem; text-align: center; color: var(--danger);">
          <p style="font-weight: 600;">⚠️ Gagal memuat data keuangan kas</p>
          <small style="color: var(--text-muted);">${err && err.message ? err.message : String(err)}</small>
        </div>
      </div>
    `;
  }
}

function openKeuanganModal() {
  const modal = document.getElementById('modal-keuangan');
  const form = document.getElementById('form-keuangan');
  
  form.tanggal.value = new Date().toISOString().split('T')[0];
  form.jenis_transaksi.value = 'Pengeluaran';
  form.keterangan.value = '';
  form.nominal.value = '';

  modal.classList.add('active');
}

function closeKeuanganModal() {
  document.getElementById('modal-keuangan').classList.remove('active');
}

async function saveKeuanganForm(e) {
  e.preventDefault();
  const form = e.target;

  await db.keuangan.add({
    tanggal: form.tanggal.value,
    jenis_transaksi: form.jenis_transaksi.value,
    keterangan: form.keterangan.value,
    nominal: parseFloat(form.nominal.value) || 0,
    no_nota: ''
  });

  closeKeuanganModal();
  renderKeuanganModule();
  if (typeof renderDashboardModule === 'function') renderDashboardModule();
}

async function handleHapusKeuangan(id) {
  if (confirm('Apakah Anda yakin ingin menghapus catatan kas ini?')) {
    await db.keuangan.delete(id);
    renderKeuanganModule();
    if (typeof renderDashboardModule === 'function') renderDashboardModule();
  }
}
