// db/schema.js — Dexie.js (IndexedDB) untuk M3 Chicken POS
const Dexie = window.Dexie;
if (!Dexie) {
  throw new Error('Dexie belum dimuat. Pastikan lib/dexie.js di-load sebelum schema.js');
}

export const db = new Dexie('m3chicken');

db.version(1).stores({
  users: '++id,username,role',
  menu: '++id,nama,kategori,harga,stok,barcode',
  customers: '++id,nama,telepon,alamat,riwayat',
  orders: '++id,tanggal,[tanggal+kasir],pelangganId,total',
  ledger: '++id,tanggal,[tanggal+tipe],deskripsi,nominal,kategori',
  settings: 'key,value'
});

db.version(2).stores({
  users: '++id,username,role',
  menu: '++id,nama,kategori,harga,stok,barcode',
  customers: '++id,nama,telepon,alamat,riwayat',
  orders: '++id,tanggal,[tanggal+kasir],pelangganId,total',
  ledger: '++id,tanggal,[tanggal+tipe],deskripsi,nominal,kategori',
  settings: 'key,value',
  suppliers: '++id,nama,telepon,kategori',
  cashbook: '++id,tanggal,[tanggal+tipe],tipe,kategori'
});

// [MULTI-STORE] Versi 3: tambah tabel stores + indeks store_id pada tabel yang
// sudah ada. Versi 1 & 2 tidak diubah agar data lama tetap kompatibel.
db.version(3).stores({
  users: '++id,username,role',
  menu: '++id,nama,kategori,harga,stok,barcode,store_id',
  customers: '++id,nama,telepon,alamat,riwayat,store_id',
  orders: '++id,tanggal,[tanggal+kasir],pelangganId,total,store_id',
  ledger: '++id,tanggal,[tanggal+tipe],deskripsi,nominal,kategori',
  settings: 'key,value',
  suppliers: '++id,nama,telepon,kategori,store_id',
  cashbook: '++id,tanggal,[tanggal+tipe],tipe,kategori',
  stores: '++id,&kode_toko,nama_toko,is_active,is_default'
}).upgrade(async (tx) => {
  // [MULTI-STORE] Backfill store_id = 1 untuk data lama agar tidak orphan.
  const tables = ['menu', 'customers', 'orders', 'suppliers'];
  for (const name of tables) {
    await tx.table(name).toCollection().modify((row) => {
      if (row.store_id === undefined || row.store_id === null) {
        row.store_id = 1;
      }
    });
  }
});
