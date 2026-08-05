// Proses Papan Module (Kanban Board)

async function renderProsesModule() {
  const container = document.getElementById('view-proses');
  if (!container) return;

  const allPesanan = await db.pesanan.toArray();

  // Filter pesanan aktif (bukan yang sudah 'Papan Di Antar' lama)
  const columns = {
    'Data Masuk': [],
    'Diproses': [],
    'Siap Diantar': [],
    'Papan Di Antar': []
  };

  allPesanan.forEach(p => {
    const status = p.status_proses || 'Data Masuk';
    if (columns[status]) {
      columns[status].push(p);
    } else {
      columns['Data Masuk'].push(p);
    }
  });

  // Urutkan kartu di setiap kolom (khususnya 'Papan Di Antar' agar pengantaran terbaru berada paling atas)
  Object.keys(columns).forEach(col => {
    columns[col].sort((a, b) => {
      const tglA = a.tgl_status_antar || a.tanggal_antar || a.tanggal || '';
      const tglB = b.tgl_status_antar || b.tanggal_antar || b.tanggal || '';
      if (tglA !== tglB) {
        return tglB.localeCompare(tglA);
      }
      return (b.id || 0) - (a.id || 0);
    });
  });

  let html = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">🎨 Status Produksi & Proses Papan Bunga</div>
        <p style="font-size:0.85rem; color:var(--text-muted); width:100%;">Geser atau ubah status pengerjaan papan dari Data Masuk hingga Papan Di Antar.</p>
      </div>

      <div class="kanban-grid">
        ${Object.keys(columns).map(colName => `
          <div class="kanban-column">
            <div class="kanban-header">
              <span>${colName}</span>
              <span class="badge badge-proses">${columns[colName].length}</span>
            </div>
            <div class="kanban-cards-wrapper">
              ${columns[colName].length > 0 ? columns[colName].map(p => {
    const safeNama = (p.nama_pemesan || '').replace(/'/g, "\\'");
    const safeWa = (p.no_wa || '').replace(/'/g, "\\'");
    const safeNota = (p.no_nota || '').replace(/'/g, "\\'");
    return `
                <div class="kanban-card">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <b style="cursor:pointer; color:var(--text-main);" 
                       onclick="handleWaClick(event, '${safeWa}', '${safeNama}', '${safeNota}', ${p.id})">
                      ${p.nama_pemesan || '-'} <span style="color:#25D366; font-size:0.85rem;">💬</span>
                    </b>
                    <small style="color:var(--text-muted);">${p.no_nota || ''}</small>
                  </div>
                  <div style="font-size:0.8rem; color:var(--info); margin:0.3rem 0;">
                    ${p.jenis_papan} | Antar: ${p.tanggal_antar || p.tanggal}
                  </div>
                  <div style="font-size:0.78rem; color:var(--text-muted); font-style:italic; margin-bottom:0.6rem;">
                    "${p.ucapan || '-'}"
                  </div>
                  <div style="margin-top:0.5rem; display:flex; justify-content:space-between; align-items:center;">
                    <select class="form-control" style="font-size:0.75rem; padding:0.25rem 0.5rem; width:auto;"
                            onchange="handleChangeStatusProses(${p.id}, this.value)">
                      <option value="Data Masuk" ${colName === 'Data Masuk' ? 'selected' : ''}>Data Masuk</option>
                      <option value="Diproses" ${colName === 'Diproses' ? 'selected' : ''}>Diproses</option>
                      <option value="Siap Diantar" ${colName === 'Siap Diantar' ? 'selected' : ''}>Siap Diantar</option>
                      <option value="Papan Di Antar" ${colName === 'Papan Di Antar' ? 'selected' : ''}>Papan Di Antar</option>
                    </select>
                  </div>
                </div>
              `).join('') : `<div style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding:2rem 0;">Kosong</div>`}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

async function handleChangeStatusProses(id, newStatus) {
  await dbUpdateStatusProses(id, newStatus);
  renderProsesModule();
  if (typeof renderDashboardModule === 'function') renderDashboardModule();
}
