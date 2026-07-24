// Jadwal Pengantaran Module

async function renderJadwalModule() {
  const container = document.getElementById('view-jadwal');
  if (!container) return;

  const allPesanan = await db.pesanan.toArray();
  const todayStr = new Date().toISOString().split('T')[0];

  // Grouping pesanan by tanggal_antar
  const grouped = {};
  allPesanan.forEach(p => {
    const tgl = p.tanggal_antar || p.tanggal || 'Tanpa Tanggal';
    if (!grouped[tgl]) grouped[tgl] = [];
    grouped[tgl].push(p);
  });

  const sortedDates = Object.keys(grouped).sort().reverse();

  let html = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">📅 Jadwal Pengantaran Papan Bunga</div>
        <p style="font-size:0.85rem; color:var(--text-muted); width:100%;">Daftar jadwal kirim armada papan bunga berdasarkan tanggal pengantaran.</p>
      </div>

      ${sortedDates.length > 0 ? sortedDates.map(tgl => `
        <div style="margin-bottom:1.5rem;">
          <div style="padding:0.5rem 0.75rem; background:rgba(255,255,255,0.05); border-left:4px solid ${tgl === todayStr ? '#f59e0b' : '#3b82f6'}; border-radius:4px; font-weight:700; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
            <span>🗓️ Tanggal Antar: ${tgl} ${tgl === todayStr ? '⚠️ (HARI INI!)' : ''}</span>
            <span class="badge badge-proses">${grouped[tgl].length} Papan</span>
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
                        <option value="Papan Di Antar" ${p.status_proses === 'Papan Di Antar' ? 'selected' : ''}>Papan Di Antar</option>
                      </select>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('') : `<div style="text-align:center; color:var(--text-muted); padding:3rem 0;">Belum ada jadwal pengantaran.</div>`}
    </div>
  `;

  container.innerHTML = html;
}
