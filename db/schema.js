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
