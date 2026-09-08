// IndexedDB Manager via Dexie.js
// Replikasi logika database.py untuk Offline-First Storage

// Helper: Ambil tanggal LOKAL (bukan UTC) dalam format YYYY-MM-DD
// Penting untuk WIB (UTC+7): jam 00:29 WIB = 1 Agustus, bukan 31 Juli
function getTodayLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const db = new Dexie('FinancePapanBungaDB');

// Definisikan Skema Tabel
db.version(1).stores({
  pesanan: '++id, no_nota, tanggal, tanggal_antar, tgl_status_antar, nama_pemesan, jenis_papan, status_lunas, status_proses',
  keuangan: '++id, no_nota, tanggal, jenis_transaksi, nominal',
  pengaturan: 'id'
});

db.version(2).stores({
  pesanan: '++id, no_nota, tanggal, tanggal_antar, tgl_status_antar, nama_pemesan, no_wa, jenis_papan, status_lunas, status_proses'
});

db.version(3).stores({
  pesanan: '++id, no_nota, tanggal, tanggal_antar, tgl_status_antar, nama_pemesan, no_wa, jenis_papan, status_lunas, status_proses, gps_lat, gps_lng'
});

// Global Helper HTML5 GPS Geolocation
function captureCurrentGpsLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('[GPS] Geolocation tidak didukung browser ini.');
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: new Date().toISOString()
        });
      },
      (err) => {
        console.warn('[GPS] Gagal membaca GPS atau akses ditolak:', err.message || err);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

// Global Helper Google Maps URL Generator
function getGmapsUrl(p) {
  if (!p) return '';
  if (p.gps_lat && p.gps_lng) {
    return `https://www.google.com/maps?q=${p.gps_lat},${p.gps_lng}`;
  }
  if (p.lokasi_pengantaran && p.lokasi_pengantaran.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.lokasi_pengantaran.trim())}`;
  }
  return '';
}

// Global Helper WhatsApp dengan Template Pesan Otomatis
function getWaUrl(noWa, context = 'pesanan', data = {}) {
  if (!noWa) return '';
  let cleaned = String(noWa).replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }

  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  const namaToko = data.namaToko || 'AKIO FLORIST';
  const nama = data.nama || 'Pelanggan';
  let text = '';

  if (context === 'pesanan') {
    const statusBayar = (data.dibayar >= data.harga && data.harga > 0) ? 'LUNAS' : `Sisa ${formatRp((data.harga || 0) - (data.dibayar || 0))}`;
    text = `Halo Kak *${nama}*,\n\nTerima kasih telah memesan karangan papan bunga di *${namaToko}*. 🙏💐\n\nBerikut rincian pesanan Anda:\n📄 *No. Nota:* ${data.noNota || '-'}\n🗓️ *Tgl Pengantaran:* ${data.tglAntar || '-'}\n📍 *Lokasi Tujuan:* ${data.lokasi || '-'}\n📦 *Jenis Papan:* ${data.jenisPapan || 'Papan Bunga'}\n📝 *Ucapan Tertulis:* "${data.ucapan || '-'}"\n💰 *Total Biaya:* ${formatRp(data.harga)} (*Status: ${statusBayar}*)\n\nPesanan Anda saat ini sedang kami proses dengan sebaik-baiknya. Terima kasih atas kepercayaannya! ✨`;
  } else if (context === 'antar') {
    text = `Halo Kak *${nama}*,\n\nKabar baik! Papan bunga pesanan Anda (*No. Nota: ${data.noNota || '-'}*) telah selesai kami antarkan dan terpasang rapi di lokasi:\n📍 *${data.lokasi || '-'}*\n\nBersama pesan ini, kami lampirkan foto dokumentasi papan bunga di lokasi acara ya Kak. 📸👇\n\nTerima kasih banyak telah mempercayakan karangan bunga Anda kepada *${namaToko}*. Semoga acaranya berjalan lancar dan sukses selalu! 🙏💐`;
  } else if (context === 'hutang') {
    text = `Halo Kak *${nama}*,\n\nSalam hangat dari *${namaToko}*. 🙏💐\n\nMengingat pesanan papan bunga telah selesai dikerjakan, kami ingin mengonfirmasikan perihal sisa tagihan atas nama *${nama}*:\n💰 *Total Sisa Tagihan:* *${formatRp(data.totalHutang)}*\n📋 *Rincian:* ${data.totalTunggakan || 1} Pesanan Belum Lunas\n\nMohon kesediaannya untuk melakukan penyelesaian pembayaran. Jika sudah melakukan transfer, mohon kirimkan bukti pembayarannya ke nomor ini ya Kak.\n\nTerima kasih banyak atas kerja sama dan kepercayaannya! 🙏✨`;
  }

  return text ? `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}` : `https://wa.me/${cleaned}`;
}

function handleWaClick(e, noWa, context = 'pesanan', data = {}, id = null) {
  if (e && e.stopPropagation) e.stopPropagation();
  // Backwards compatibility jika dipanggil format lama (e, noWa, nama, noNota, id)
  if (typeof context === 'string' && context !== 'pesanan' && context !== 'antar' && context !== 'hutang') {
    id = typeof data === 'number' ? data : id;
    data = { nama: context, noNota: typeof data === 'string' ? data : '' };
    context = 'pesanan';
  }

  if (noWa && String(noWa).trim()) {
    const url = getWaUrl(noWa, context, data);
    if (url) window.open(url, '_blank');
  } else {
    const nama = (data && data.nama) ? data.nama : '-';
    if (id) {
      if (confirm(`Nomor WhatsApp untuk pemesan "${nama}" belum diisi.\n\nApakah Anda ingin mengedit pesanan ini untuk menambahkan Nomor WA?`)) {
        if (typeof openPesananModal === 'function') openPesananModal(id);
      }
    } else {
      alert(`Nomor WhatsApp untuk pemesan/pelanggan "${nama}" belum diisi.\nSilakan tambahkan nomor WA pada data pesanan pemesan ini.`);
    }
  }
}

// Helper Khusus Kirim WA Konfirmasi Pesanan Baru / Rincian
async function handleWaPesananClick(e, id) {
  if (e && e.stopPropagation) e.stopPropagation();
  try {
    const p = await db.pesanan.get(id);
    if (!p) return;
    const config = await db.pengaturan.get(1) || {};
    handleWaClick(e, p.no_wa, 'pesanan', {
      nama: p.nama_pemesan,
      noNota: p.no_nota,
      tglAntar: p.tanggal_antar || p.tanggal,
      lokasi: p.lokasi_pengantaran,
      jenisPapan: p.jenis_papan,
      ucapan: p.ucapan,
      harga: p.harga,
      dibayar: p.dibayar,
      namaToko: config.nama_toko
    }, p.id);
  } catch (err) {
    console.error('Gagal mengirim WA pesanan:', err);
  }
}

// Helper Khusus Kirim WA Kabar Antar & Foto Dokumentasi
async function handleWaAntarClick(e, id) {
  if (e && e.stopPropagation) e.stopPropagation();
  try {
    const p = await db.pesanan.get(id);
    if (!p) return;
    const config = await db.pengaturan.get(1) || {};
    handleWaClick(e, p.no_wa, 'antar', {
      nama: p.nama_pemesan,
      noNota: p.no_nota,
      lokasi: p.lokasi_pengantaran,
      namaToko: config.nama_toko
    }, p.id);
  } catch (err) {
    console.error('Gagal mengirim WA antar:', err);
  }
}

// Helper Khusus Kirim WA Pengingat Hutang Pelanggan
async function handleWaHutangClick(e, nama, noWa, totalHutang, totalTunggakan) {
  if (e && e.stopPropagation) e.stopPropagation();
  try {
    const config = await db.pengaturan.get(1) || {};
    handleWaClick(e, noWa, 'hutang', {
      nama: nama,
      totalHutang: parseFloat(totalHutang) || 0,
      totalTunggakan: parseInt(totalTunggakan) || 1,
      namaToko: config.nama_toko
    }, null);
  } catch (err) {
    console.error('Gagal mengirim WA hutang:', err);
  }
}

// Seed data pengaturan & auto-import data_initial.json jika database kosong
async function seedDefaultSettings() {
  const pesananCount = await db.pesanan.count();
  if (pesananCount === 0) {
    try {
      const res = await fetch('./data_initial.json');
      if (res.ok) {
        const initialData = await res.json();
        if (initialData && initialData.pesanan) {
          await dbImportFullBackupJSON(initialData);
          console.log('[DB] Auto-loaded initial database from data_initial.json');
          return;
        }
      }
    } catch (e) {
      console.log('[DB] No initial json file found, seeding default settings.');
    }
  }

  const count = await db.pengaturan.count();
  if (count === 0) {
    await db.pengaturan.add({
      id: 1,
      nama_toko: 'AKIO FLORIST',
      tagline: 'Pusat Karangan Bunga',
      alamat: '',
      telepon: '',
      website_url: '',
      logo_path: ''
    });
  }
}

// Global Helper Escape Karakter Khusus untuk HTML & Atribut
function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate Nomor Nota Otomatis (INV + YYYY + 001)
async function generateNoNota(tanggalStr) {
  const tahun = tanggalStr ? tanggalStr.substring(0, 4) : new Date().getFullYear().toString();
  const prefix = `INV${tahun}`;
  
  const matches = await db.pesanan
    .filter(p => p.no_nota && p.no_nota.startsWith(prefix))
    .toArray();
    
  let maxUrutan = 0;
  for (const p of matches) {
    if (p.no_nota && p.no_nota.startsWith(prefix)) {
      const numStr = p.no_nota.substring(prefix.length);
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxUrutan) {
        maxUrutan = num;
      }
    }
  }
  const nextNum = maxUrutan + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

// Tambah Pesanan Baru + Otomatis Kas Pemasukan jika ada DP/Pelunasan
async function dbTambahPesanan(data) {
  const tanggal = data.tanggal || getTodayLocal();
  const no_nota = await generateNoNota(tanggal);
  const nama_pemesan_clean = (data.nama_pemesan || '').trim();
  const harga = parseFloat(data.harga) || 0;
  const dibayar = parseFloat(data.dibayar) || 0;
  const status_lunas = dibayar >= harga ? 1 : (parseInt(data.status_lunas) || 0);

  const pesananId = await db.pesanan.add({
    no_nota,
    tanggal,
    nama_pemesan: nama_pemesan_clean,
    no_wa: (data.no_wa || '').trim(),
    lokasi_pengantaran: data.lokasi_pengantaran || '',
    jenis_papan: data.jenis_papan || '',
    ucapan: data.ucapan || '-',
    harga,
    dibayar,
    status_lunas,
    status_proses: data.status_proses || 'Data Masuk',
    tanggal_antar: data.tanggal_antar || tanggal,
    tgl_status_antar: ''
  });

  if (dibayar > 0) {
    await db.keuangan.add({
      tanggal,
      jenis_transaksi: 'Pemasukan',
      keterangan: `Pembayaran Pesanan ${nama_pemesan_clean} (Nota: ${no_nota})`,
      nominal: dibayar,
      no_nota
    });
  }

  if (typeof autoSyncBackgroundPush === 'function') autoSyncBackgroundPush();
  if (typeof pushRealtimeChange === 'function') pushRealtimeChange('full_sync');
  return pesananId;
}

// Update Pesanan + Update Transaksi Kas Terkait (Bebas Double Counting)
async function dbUpdatePesanan(id, data) {
  const pesanan = await db.pesanan.get(id);
  if (!pesanan) return;

  const no_nota = pesanan.no_nota;
  const nama_pemesan_clean = (data.nama_pemesan || '').trim();
  const harga = parseFloat(data.harga) || 0;
  const dibayar = parseFloat(data.dibayar) || 0;
  const status_lunas = dibayar >= harga ? 1 : (parseInt(data.status_lunas) || 0);
  const tanggal = data.tanggal || pesanan.tanggal;
  const dibayarLama = parseFloat(pesanan.dibayar) || 0;

  await db.pesanan.update(id, {
    tanggal,
    nama_pemesan: nama_pemesan_clean,
    no_wa: (data.no_wa || '').trim(),
    lokasi_pengantaran: data.lokasi_pengantaran || '',
    jenis_papan: data.jenis_papan || '',
    ucapan: data.ucapan || '-',
    harga,
    dibayar,
    status_lunas,
    tanggal_antar: data.tanggal_antar || tanggal
  });

  if (no_nota) {
    // Jika jumlah dibayar berubah, rekonsiliasi kas agar totalnya presisi dan bebas duplikasi
    if (Math.abs(dibayar - dibayarLama) > 0.01) {
      // Hapus seluruh transaksi kas lama untuk nomor nota ini (baik DP, cicilan, maupun pelunasan)
      await db.keuangan.where('no_nota').equals(no_nota).delete();

      if (dibayar > 0) {
        await db.keuangan.add({
          tanggal,
          jenis_transaksi: 'Pemasukan',
          keterangan: `Pembayaran Pesanan ${nama_pemesan_clean} (Nota: ${no_nota})`,
          nominal: dibayar,
          no_nota
        });
      }
    } else {
      // Jika jumlah dibayar TIDAK berubah, cukup update keterangan nama pemesan jika berubah
      const kasRows = await db.keuangan.where('no_nota').equals(no_nota).toArray();
      for (const k of kasRows) {
        if (k.keterangan && k.keterangan.includes(`(Nota: ${no_nota})`)) {
          const updatedKet = k.keterangan
            .replace(/Pesanan [^(]+ \(Nota:/, `Pesanan ${nama_pemesan_clean} (Nota:`)
            .replace(/Hutang [^(]+ \(Nota:/, `Hutang ${nama_pemesan_clean} (Nota:`);
          if (updatedKet !== k.keterangan) {
            await db.keuangan.update(k.id, { keterangan: updatedKet });
          }
        }
      }
    }
  }

  if (typeof autoSyncBackgroundPush === 'function') autoSyncBackgroundPush();
  if (typeof pushRealtimeChange === 'function') pushRealtimeChange('full_sync');
}

// Global Unified Handler Update Status Proses
async function handleChangeStatusProsesGlobal(id, statusBaru, callbackAfterUpdate) {
  try {
    let gpsData = null;
    if (statusBaru === 'Papan Di Antar' && typeof captureCurrentGpsLocation === 'function') {
      gpsData = await captureCurrentGpsLocation();
    }
    await dbUpdateStatusProses(id, statusBaru, gpsData);
    if (typeof callbackAfterUpdate === 'function') {
      callbackAfterUpdate();
    } else {
      if (typeof renderProsesModule === 'function') renderProsesModule();
      if (typeof renderJadwalModule === 'function') renderJadwalModule();
      if (typeof renderDashboardModule === 'function') renderDashboardModule();
      if (typeof renderPesananModule === 'function') renderPesananModule();
    }
  } catch (err) {
    console.error('[StatusProses] Gagal update status:', err);
  }
}

// Tambah Catatan Transaksi Kas Manual (Pengeluaran / Pemasukan)
async function dbTambahKeuangan(data) {
  const id = await db.keuangan.add({
    tanggal: data.tanggal || getTodayLocal(),
    jenis_transaksi: data.jenis_transaksi || 'Pengeluaran',
    keterangan: (data.keterangan || '').trim(),
    nominal: parseFloat(data.nominal) || 0,
    no_nota: data.no_nota || ''
  });

  if (typeof autoSyncBackgroundPush === 'function') autoSyncBackgroundPush();
  if (typeof pushRealtimeChange === 'function') pushRealtimeChange('full_sync');
  return id;
}

// Hapus Catatan Transaksi Kas Manual
async function dbHapusKeuangan(id) {
  await db.keuangan.delete(id);
  if (typeof autoSyncBackgroundPush === 'function') autoSyncBackgroundPush();
  if (typeof pushRealtimeChange === 'function') pushRealtimeChange('full_sync');
}

// Hapus Pesanan + Transaksi Kas Terkait
async function dbHapusPesanan(id) {
  const pesanan = await db.pesanan.get(id);
  if (pesanan && pesanan.no_nota) {
    await db.keuangan.where('no_nota').equals(pesanan.no_nota).delete();
  }
  await db.pesanan.delete(id);
  if (typeof autoSyncBackgroundPush === 'function') autoSyncBackgroundPush();
  if (typeof pushRealtimeChange === 'function') pushRealtimeChange('full_sync');
}

// Tandai Lunas Satu Pesanan
async function dbTandaiLunas(id) {
  const pesanan = await db.pesanan.get(id);
  if (!pesanan) return;

  const harga = pesanan.harga || 0;
  const dibayarLama = pesanan.dibayar || 0;
  const selisih = harga - dibayarLama;

  await db.pesanan.update(id, {
    status_lunas: 1,
    dibayar: harga
  });

  if (selisih > 0) {
    const today = getTodayLocal();
    await db.keuangan.add({
      tanggal: today,
      jenis_transaksi: 'Pemasukan',
      keterangan: `Pelunasan Pesanan ${pesanan.nama_pemesan} (Nota: ${pesanan.no_nota})`,
      nominal: selisih,
      no_nota: pesanan.no_nota
    });
  }

  if (typeof autoSyncBackgroundPush === 'function') autoSyncBackgroundPush();
  if (typeof pushRealtimeChange === 'function') pushRealtimeChange('full_sync');
}

// Update Status Proses Papan & Capture GPS jika 'Papan Di Antar'
async function dbUpdateStatusProses(id, statusBaru, gpsData = null) {
  const today = getTodayLocal();
  if (statusBaru === 'Papan Di Antar') {
    const updatePayload = {
      status_proses: statusBaru,
      tgl_status_antar: today
    };
    if (gpsData && gpsData.lat && gpsData.lng) {
      updatePayload.gps_lat = gpsData.lat;
      updatePayload.gps_lng = gpsData.lng;
      updatePayload.gps_antar = `https://www.google.com/maps?q=${gpsData.lat},${gpsData.lng}`;
    }
    await db.pesanan.update(id, updatePayload);
  } else {
    await db.pesanan.update(id, { status_proses: statusBaru });
  }

  if (typeof autoSyncBackgroundPush === 'function') autoSyncBackgroundPush();
  if (typeof pushRealtimeChange === 'function') pushRealtimeChange('full_sync');
}

// Rekap Hutang per Pelanggan
async function dbGetRekapHutangPelanggan() {
  const allPesanan = await db.pesanan.toArray();
  const map = {};

  allPesanan.forEach(p => {
    const dibayar = p.dibayar || 0;
    const harga = p.harga || 0;
    if (dibayar < harga) {
      const namaKey = (p.nama_pemesan || '').trim().toUpperCase();
      if (!map[namaKey]) {
        map[namaKey] = {
          nama: (p.nama_pemesan || '').trim(),
          no_wa: p.no_wa || '',
          total_tunggakan: 0,
          total_hutang: 0,
          tgl_awal: p.tanggal_antar || p.tgl_status_antar || p.tanggal
        };
      }
      if (!map[namaKey].no_wa && p.no_wa) {
        map[namaKey].no_wa = p.no_wa;
      }
      map[namaKey].total_tunggakan += 1;
      map[namaKey].total_hutang += (harga - dibayar);
      const tgl = p.tanggal_antar || p.tgl_status_antar || p.tanggal;
      if (tgl && tgl < map[namaKey].tgl_awal) {
        map[namaKey].tgl_awal = tgl;
      }
    }
  });

  return Object.values(map).sort((a, b) => b.total_hutang - a.total_hutang);
}

// Bayar Lunas Seluruh Hutang Pelanggan
async function dbBayarLunasPelanggan(namaPelanggan) {
  const targetNama = (namaPelanggan || '').trim().toUpperCase();
  const allPesanan = await db.pesanan.toArray();
  const unpaid = allPesanan.filter(p => (p.nama_pemesan || '').trim().toUpperCase() === targetNama && (p.dibayar || 0) < (p.harga || 0));

  const today = getTodayLocal();

  for (const row of unpaid) {
    const kekurangan = row.harga - (row.dibayar || 0);
    await db.pesanan.update(row.id, {
      dibayar: row.harga,
      status_lunas: 1
    });

    if (kekurangan > 0) {
      await db.keuangan.add({
        tanggal: today,
        jenis_transaksi: 'Pemasukan',
        keterangan: `Pelunasan Hutang ${targetNama} (Nota: ${row.no_nota})`,
        nominal: kekurangan,
        no_nota: row.no_nota
      });
    }
  }

  if (typeof autoSyncBackgroundPush === 'function') autoSyncBackgroundPush();
  if (typeof pushRealtimeChange === 'function') pushRealtimeChange('full_sync');
}

// Bayar Cicilan / Sebagian Pelanggan
async function dbBayarSebagianPelanggan(namaPelanggan, jumlahBayar) {
  const targetNama = (namaPelanggan || '').trim().toUpperCase();
  const allPesanan = await db.pesanan.toArray();
  const unpaid = allPesanan
    .filter(p => (p.nama_pemesan || '').trim().toUpperCase() === targetNama && (p.dibayar || 0) < (p.harga || 0))
    .sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));

  const today = getTodayLocal();
  let sisaBayar = parseFloat(jumlahBayar) || 0;

  for (const row of unpaid) {
    if (sisaBayar <= 0) break;

    const dibayarSkrg = row.dibayar || 0;
    const harga = row.harga || 0;
    const kekurangan = harga - dibayarSkrg;

    const tambah = Math.min(sisaBayar, kekurangan);
    const totalBaru = dibayarSkrg + tambah;
    const statusLunas = totalBaru >= harga ? 1 : 0;

    await db.pesanan.update(row.id, {
      dibayar: totalBaru,
      status_lunas: statusLunas
    });

    if (tambah > 0) {
      await db.keuangan.add({
        tanggal: today,
        jenis_transaksi: 'Pemasukan',
        keterangan: `Cicilan Hutang ${targetNama} (Nota: ${row.no_nota})`,
        nominal: tambah,
        no_nota: row.no_nota
      });
    }

    sisaBayar -= tambah;
  }

  if (typeof autoSyncBackgroundPush === 'function') autoSyncBackgroundPush();
  if (typeof pushRealtimeChange === 'function') pushRealtimeChange('full_sync');
}

// Export Full Data JSON untuk Backup / Drive Sync
async function dbExportFullBackupJSON() {
  const pesanan = await db.pesanan.toArray();
  const keuangan = await db.keuangan.toArray();
  const pengaturan = await db.pengaturan.toArray();

  return JSON.stringify({
    app: 'FinancePapanBungaPWA',
    version: '1.0',
    exportDate: new Date().toISOString(),
    pesanan,
    keuangan,
    pengaturan
  }, null, 2);
}

// Import Full Data JSON dari Drive Sync / Restore
async function dbImportFullBackupJSON(jsonStr) {
  const data = typeof jsonStr === 'object' ? jsonStr : JSON.parse(jsonStr);
  if (!data || !data.pesanan || !data.keuangan) {
    throw new Error('Format file backup data tidak valid!');
  }

  await db.transaction('rw', db.pesanan, db.keuangan, db.pengaturan, async () => {
    await db.pesanan.clear();
    await db.keuangan.clear();
    await db.pengaturan.clear();

    await db.pesanan.bulkAdd(data.pesanan);
    await db.keuangan.bulkAdd(data.keuangan);
    if (data.pengaturan && data.pengaturan.length > 0) {
      await db.pengaturan.bulkAdd(data.pengaturan);
    } else {
      await seedDefaultSettings();
    }
  });
}

// Reset / Kosongkan Seluruh Data Transaksi (Pesanan & Keuangan) dengan Auto-Backup Aman
async function dbResetSemuaDataTransaksi() {
  // 1. Ekspor data lengkap saat ini sebagai backup otomatis sebelum dihapus
  const backupJson = await dbExportFullBackupJSON();
  const dateStr = typeof getTodayLocal === 'function' ? getTodayLocal() : new Date().toISOString().split('T')[0];
  const blob = new Blob([backupJson], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup-sebelum-reset-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);

  // 2. Kosongkan tabel pesanan dan keuangan di IndexedDB lokal (pengaturan toko tetap dipertahankan)
  await db.transaction('rw', db.pesanan, db.keuangan, async () => {
    await db.pesanan.clear();
    await db.keuangan.clear();
  });

  // 3. Sinkronisasi perubahan ke Firebase Realtime Database
  if (typeof pushRealtimeChange === 'function') {
    pushRealtimeChange('full_sync');
  }

  return true;
}

// Inisialisasi saat script dimuat
seedDefaultSettings();
