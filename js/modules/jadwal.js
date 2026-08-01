// Jadwal Pengantaran Module (With Bulk Checkbox Status Update & Pending Deliveries Only)

let selectedJadwalIds = new Set();

async function renderJadwalModule() {
  const container = document.getElementById('view-jadwal');
  if (!container) return;

  selectedJadwalIds.clear();

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
      <div class="card-header" style="flex-wrap:wrap; gap:1rem;">
        <div>
          <div class="card-title">📅 Jadwal Pengantaran Papan Bunga (Belum Diantar)</div>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">
            Tandai centang pada papan yang ingin diubah statusnya sekaligus menjadi <b>Papan Di Antar</b>.
          </p>
        </div>

        ${pendingPesanan.length > 0 ? `
          <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
            <button id="btn-bulk-antar" class="btn btn-success" disabled onclick="handleBulkUpdateStatusAntar()">
              🚚 Ubah <span id="bulk-count-badge">(0)</span> Papan Terpilih ➔ Papan Di Antar
            </button>
          </div>
        ` : ''}
      </div>

      ${sortedDates.length > 0 ? sortedDates.map(tgl => `
        <div style="margin-bottom:1.5rem;">
          <div style="padding:0.6rem 0.85rem; background:rgba(255,255,255,0.05); border-left:4px solid ${tgl === todayStr ? '#f59e0b' : '#3b82f6'}; border-radius:6px; font-weight:700; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <span>🗓️ Tanggal Antar: ${tgl} ${tgl === todayStr ? '⚠️ (HARI INI!)' : ''}</span>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <label style="font-size:0.8rem; cursor:pointer; color:var(--text-muted);">
                <input type="checkbox" onchange="toggleSelectAllGroup('${tgl}', this.checked)" style="transform:scale(1.1); margin-right:4px;"> Pilih Semua Tgl Ini
              </label>
              <span class="badge badge-proses">${grouped[tgl].length} Papan Belum Antar</span>
            </div>
          </div>

          <!-- Tampilan Desktop (Tabel 6 Kolom) -->
          <div class="table-responsive desktop-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:40px; text-align:center;">Pilih</th>
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
                    <td style="text-align:center;">
                      <input type="checkbox" class="jadwal-check-item check-group-${tgl}" value="${p.id}" 
                             onchange="onJadwalCheckChange(this)" style="width:18px; height:18px; cursor:pointer;">
                    </td>
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

          <!-- Tampilan Native Mobile Feed Cards (Khusus HP Armada) -->
          <div class="mobile-card-list">
            ${grouped[tgl].map(p => `
              <div class="mobile-card-item">
                <div class="mobile-card-header">
                  <span class="nota-no">📄 ${p.no_nota || '-'}</span>
                  <span class="badge badge-proses">${p.status_proses || 'Data Masuk'}</span>
                </div>
                <div class="mobile-card-body">
                  <div class="customer-name">${p.nama_pemesan || '-'}</div>
                  <div style="font-size:0.85rem; color:#60a5fa; font-weight:600;">📍 ${p.lokasi_pengantaran || '-'}</div>
                  <div class="ucapan-quote">"${p.ucapan || '-'}"</div>
                </div>
                <div class="mobile-card-actions" style="margin-top:0.5rem;">
                  <button class="btn btn-success" style="width:100%;" onclick="handleChangeStatusProses(${p.id}, 'Papan Di Antar')">🚚 Tandai Selesai Diantar</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('') : `<div style="text-align:center; color:var(--success); padding:3rem 0; font-weight:700;">🎉 Semua pesanan pengantaran telah selesai diantar!</div>`}
    </div>
  `;

  container.innerHTML = html;
}

function onJadwalCheckChange(el) {
  const id = parseInt(el.value);
  if (el.checked) {
    selectedJadwalIds.add(id);
  } else {
    selectedJadwalIds.delete(id);
  }
  updateBulkButtonState();
}

function toggleSelectAllGroup(tglGroup, isChecked) {
  const checkboxes = document.querySelectorAll(`.check-group-${tglGroup}`);
  checkboxes.forEach(cb => {
    cb.checked = isChecked;
    const id = parseInt(cb.value);
    if (isChecked) {
      selectedJadwalIds.add(id);
    } else {
      selectedJadwalIds.delete(id);
    }
  });
  updateBulkButtonState();
}

function updateBulkButtonState() {
  const btn = document.getElementById('btn-bulk-antar');
  const badge = document.getElementById('bulk-count-badge');
  const count = selectedJadwalIds.size;

  if (badge) badge.innerText = `(${count})`;

  if (btn) {
    if (count > 0) {
      btn.disabled = false;
      btn.classList.add('btn-success');
      btn.style.opacity = '1';
    } else {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    }
  }
}

async function handleBulkUpdateStatusAntar() {
  const count = selectedJadwalIds.size;
  if (count === 0) return;

  if (confirm(`Ubah status ${count} papan bunga terpilih sekaligus menjadi "Papan Di Antar"?`)) {
    const ids = Array.from(selectedJadwalIds);
    for (const id of ids) {
      await dbUpdateStatusProses(id, 'Papan Di Antar');
    }

    selectedJadwalIds.clear();
    alert(`✅ Berhasil memperbarui ${count} papan menjadi "Papan Di Antar"!`);
    renderJadwalModule();
    if (typeof renderDashboardModule === 'function') renderDashboardModule();
    if (typeof renderProsesModule === 'function') renderProsesModule();
  }
}

async function handleChangeStatusProses(id, statusBaru) {
  await dbUpdateStatusProses(id, statusBaru);
  renderJadwalModule();
  if (typeof renderDashboardModule === 'function') renderDashboardModule();
  if (typeof renderProsesModule === 'function') renderProsesModule();
}
