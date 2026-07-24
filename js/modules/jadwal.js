// Jadwal Pengantaran Module (Only Un-delivered Pending Orders)

async function renderJadwalModule() {
  const container = document.getElementById('view-jadwal');
  if (!container) return;

  const allPesanan = await db.pesanan.toArray();
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter HANYA pesanan yang BELUM diantar (status_proses !== 'Papan Di Antar')
  const pendingPesanan = allPesanan.filter(p => p.status_proses !== 'Papan Di Antar');

  // Grouping pesanan by tanggal_antar
  const grouped = {};
  pendingPesanan.forEach(p => {
    const tgl = p.tanggal_antar || p.tanggal || 'Tanpa Tanggal';
    if (!grouped[tgl]) grouped[tgl] = [];
    grouped[tgl].push(p);
  });

  const sortedDates = Object.keys(grouped).sort().reverse();

  let html = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">📅 Jadwal Pengantaran Papan Bunga (Belum Diantar)</div>
        <p style="font-size:0.85rem; color:var(--text-muted); width:100%;">
          Menampilkan daftar jadwal armada pesanan yang <b>belum selesai diantar</b>.
        </p>
      </div>

      ${sortedDates.length > 0 ? sortedDates.map(tgl => `
        <div style="margin-bottom:1.5rem;">
          <div style="padding:0.5rem 0.75rem; background:rgba(255,255,255,0.05); border-left:4px solid ${tgl === todayStr ? '#f59e0b' : '#3b82f6'}; border-radius:4px; font-weight:700; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
            <span>🗓️ Tanggal Antar: ${tgl} ${tgl === todayStr ? '⚠️ (HARI INI!)' : ''}</span>
            <span class="badge badge-proses">${grouped[tgl].length} Papan Belum Antar</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>No. Nota</th>
                  <th>Pemesan</th>
                  <th>Jenis & Ucapan</th>
                  <th>Lokasi Pengantaran</th>
                  <th>Status Armada</th>
                </tr>
              </thead>
              <tbody>
                ${grouped[tgl].map(p => `
                  <tr>
                    <td><b>${p.no_nota || '-'}</b></td>
                    <td><b>${p.nama_pemesan || '-'}</b></td>
                    <td>
                      <span class="badge badge-proses">${p.jenis_papan}</span><br>
                      <small style="color:var(--text-muted); font-style:italic;">"${p.ucapan || '-'}"</small>
                    </td>
                    <td>📍 ${p.lokasi_pengantaran || '-'}</td>
                    <td>
                      <select class="form-control" style="font-size:0.8rem; padding:0.3rem;" onchange="handleChangeStatusProses(${p.id}, this.value)">
                        <option value="Data Masuk" ${p.status_proses === 'Data Masuk' ? 'selected' : ''}>Data Masuk</option>
                        <option value="Diproses" ${p.status_proses === 'Diproses' ? 'selected' : ''}>Diproses</option>
                        <option value="Siap Diantar" ${p.status_proses === 'Siap Diantar' ? 'selected' : ''}>Siap Diantar</option>
                        <option value="Papan Di Antar" ${p.status_proses === 'Papan Di Antar' ? 'selected' : ''}>Papan Di Antar (Selesai)</option>
                      </select>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('') : `<div style="text-align:center; color:var(--success); padding:3rem 0; font-weight:700;">🎉 Semua pesanan pengantaran telah selesai diantar!</div>`}
    </div>
  `;

  container.innerHTML = html;
}

async function handleChangeStatusProses(id, statusBaru) {
  await dbUpdateStatusProses(id, statusBaru);
  renderJadwalModule();
  if (typeof renderDashboardModule === 'function') renderDashboardModule();
  if (typeof renderProsesModule === 'function') renderProsesModule();
}
