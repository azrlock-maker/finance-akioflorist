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

// Generate Nomor Nota Otomatis (INV + YYYY + 001)
async function generateNoNota(tanggalStr) {
  const tahun = tanggalStr ? tanggalStr.substring(0, 4) : new Date().getFullYear().toString();
  const prefix = `INV${tahun}`;
  
  const matches = await db.pesanan
    .filter(p => p.no_nota && p.no_nota.startsWith(prefix))
    .toArray();
    
  if (matches.length > 0) {
    matches.sort((a, b) => (b.id || 0) - (a.id || 0));
    const lastNota = matches[0].no_nota;
    try {
      const urutan = parseInt(lastNota.substring(7));
      const nextNum = (isNaN(urutan) ? 0 : urutan) + 1;
      return `INV${tahun}${String(nextNum).padStart(3, '0')}`;
    } catch (e) {
      return `INV${tahun}001`;
    }
  }
  return `INV${tahun}001`;
}

// Tambah Pesanan Baru + Otomatis Kas Pemasukan jika ada DP/Pelunasan
async function dbTambahPesanan(data) {
  const tanggal = data.tanggal || new Date().toISOString().split('T')[0];
  const no_nota = await generateNoNota(tanggal);
  const nama_pemesan_clean = (data.nama_pemesan || '').trim();
  const harga = parseFloat(data.harga) || 0;
  const dibayar = parseFloat(data.dibayar) || 0;
  const status_lunas = dibayar >= harga ? 1 : (parseInt(data.status_lunas) || 0);

  const pesananId = await db.pesanan.add({
    no_nota,
    tanggal,
    nama_pemesan: nama_pemesan_clean,
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

// Update Pesanan + Update Transaksi Kas Terkait
async function dbUpdatePesanan(id, data) {
  const pesanan = await db.pesanan.get(id);
  if (!pesanan) return;

  const no_nota = pesanan.no_nota;
  const nama_pemesan_clean = (data.nama_pemesan || '').trim();
  const harga = parseFloat(data.harga) || 0;
  const dibayar = parseFloat(data.dibayar) || 0;
  const status_lunas = dibayar >= harga ? 1 : (parseInt(data.status_lunas) || 0);
  const tanggal = data.tanggal || pesanan.tanggal;

  await db.pesanan.update(id, {
    tanggal,
    nama_pemesan: nama_pemesan_clean,
    lokasi_pengantaran: data.lokasi_pengantaran || '',
    jenis_papan: data.jenis_papan || '',
    ucapan: data.ucapan || '-',
    harga,
    dibayar,
    status_lunas,
    tanggal_antar: data.tanggal_antar || tanggal
  });

  if (no_nota) {
    const kasRows = await db.keuangan
      .filter(k => k.no_nota === no_nota && k.keterangan && k.keterangan.startsWith('Pembayaran Pesanan'))
      .toArray();

    if (kasRows.length > 0) {
      if (dibayar > 0) {
        await db.keuangan.update(kasRows[0].id, {
          tanggal,
          nominal: dibayar,
          keterangan: `Pembayaran Pesanan ${nama_pemesan_clean} (Nota: ${no_nota})`
        });
      } else {
        await db.keuangan.delete(kasRows[0].id);
      }
    } else if (dibayar > 0) {
      await db.keuangan.add({
        tanggal,
        jenis_transaksi: 'Pemasukan',
        keterangan: `Pembayaran Pesanan ${nama_pemesan_clean} (Nota: ${no_nota})`,
        nominal: dibayar,
        no_nota
      });
    }
  }

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

// Update Status Proses Papan
async function dbUpdateStatusProses(id, statusBaru) {
  const today = getTodayLocal();
  if (statusBaru === 'Papan Di Antar') {
    await db.pesanan.update(id, {
      status_proses: statusBaru,
      tgl_status_antar: today
    });
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
          total_tunggakan: 0,
          total_hutang: 0,
          tgl_awal: p.tanggal_antar || p.tgl_status_antar || p.tanggal
        };
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

// Inisialisasi saat script dimuat
seedDefaultSettings();
