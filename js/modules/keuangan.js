// Keuangan Kas Module

async function renderKeuanganModule() {
  const container = document.getElementById('view-keuangan');
  if (!container) return;

  const allKeuangan = await db.keuangan.toArray();
  allKeuangan.sort((a, b) => (b.id || 0) - (a.id || 0));

  let totalMasuk = 0;
  let totalKeluar = 0;

  allKeuangan.forEach(k => {
    if (k.jenis_transaksi === 'Pemasukan') totalMasuk += (k.nominal || 0);
    if (k.jenis_transaksi === 'Pengeluaran') totalKeluar += (k.nominal || 0);
  });

  const saldo = totalMasuk - totalKeluar;
  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

  let html = `
    <div class="grid-stats">
      <div class="stat-card">
        <div class="stat-icon green">📥</div>
        <div class="stat-info">
          <div class="label">Total Pemasukan Kas</div>
          <div class="value">${formatRp(totalMasuk)}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">📤</div>
        <div class="stat-info">
          <div class="label">Total Pengeluaran Kas</div>
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
      <div class="card-header">
        <div class="card-title">💵 Pencatatan Kas Operasional</div>
        <button class="btn btn-primary" onclick="openKeuanganModal()"><span class="icon">➕</span> Tambah Transaksi</button>
      </div>

      <!-- Tampilan Desktop (Tabel 6 Kolom) -->
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
            ${allKeuangan.length > 0 ? allKeuangan.map(k => `
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
            `).join('') : `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">Belum ada riwayat transaksi kas.</td></tr>`}
          </tbody>
        </table>
      </div>

      <!-- Tampilan Native Mobile Feed Cards (Khusus HP) -->
      <div class="mobile-card-list">
        ${allKeuangan.length > 0 ? allKeuangan.map(k => `
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
        `).join('') : `<div style="text-align:center; padding:2rem; color:var(--text-muted);">Belum ada riwayat transaksi kas.</div>`}
      </div>
    </div>
  `;

  container.innerHTML = html;
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
