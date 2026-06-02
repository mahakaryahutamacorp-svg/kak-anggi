'use strict';

// Daftar tabel diurutkan sesuai dependensi foreign key.
// Urutan ini dipakai saat membuat schema dan saat restore backup.
const TABLE_ORDER = [
  'users',
  'stores',
  'categories',
  'menu',
  'customers',
  'suppliers',
  'transactions',
  'transaction_items',
  'payments'
];

// Schema SQLite (dipakai untuk mode lokal/offline & desktop portable).
const SQLITE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    nama TEXT NOT NULL,
    telepon TEXT DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode_toko TEXT UNIQUE NOT NULL,
    nama_toko TEXT NOT NULL,
    alamat TEXT,
    telepon TEXT,
    is_active INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0,
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT UNIQUE NOT NULL,
    deskripsi TEXT DEFAULT '',
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    kategori TEXT NOT NULL DEFAULT 'Ayam',
    kategori_id INTEGER,
    harga INTEGER NOT NULL DEFAULT 0,
    stok INTEGER NOT NULL DEFAULT 0,
    barcode TEXT DEFAULT '',
    store_id INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    telepon TEXT DEFAULT '',
    alamat TEXT DEFAULT '',
    store_id INTEGER DEFAULT 1,
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    kontak TEXT DEFAULT '',
    telepon TEXT DEFAULT '',
    alamat TEXT DEFAULT '',
    kategori TEXT DEFAULT '',
    hutang INTEGER DEFAULT 0,
    catatan TEXT DEFAULT '',
    store_id INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor_transaksi TEXT UNIQUE NOT NULL,
    pelanggan_id INTEGER,
    user_id INTEGER,
    total INTEGER NOT NULL DEFAULT 0,
    subtotal INTEGER NOT NULL DEFAULT 0,
    pajak INTEGER NOT NULL DEFAULT 0,
    diskon INTEGER NOT NULL DEFAULT 0,
    metode_pembayaran TEXT DEFAULT 'TUNAI',
    status TEXT DEFAULT 'SELESAI',
    catatan TEXT DEFAULT '',
    store_id INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaksi_id INTEGER NOT NULL,
    menu_id INTEGER NOT NULL,
    nama_menu TEXT NOT NULL,
    harga_satuan INTEGER NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    subtotal INTEGER NOT NULL,
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaksi_id INTEGER NOT NULL,
    jumlah INTEGER NOT NULL,
    metode TEXT NOT NULL,
    referensi TEXT DEFAULT '',
    created_at TEXT
  )`
];

// Schema MySQL (dipakai untuk mode server/Hostinger).
// Kolom timestamp memakai VARCHAR agar konsisten menyimpan ISO string
// yang sudah dipakai aplikasi (mis. "2024-01-01T10:00:00.000Z").
const MYSQL_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(40) NOT NULL,
    nama VARCHAR(190) NOT NULL,
    telepon VARCHAR(40) DEFAULT ''
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS stores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_toko VARCHAR(60) UNIQUE NOT NULL,
    nama_toko VARCHAR(190) NOT NULL,
    alamat TEXT,
    telepon VARCHAR(40),
    is_active TINYINT DEFAULT 1,
    is_default TINYINT DEFAULT 0,
    created_at VARCHAR(40)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(120) UNIQUE NOT NULL,
    deskripsi TEXT,
    created_at VARCHAR(40)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(190) NOT NULL,
    kategori VARCHAR(120) NOT NULL DEFAULT 'Ayam',
    kategori_id INT,
    harga INT NOT NULL DEFAULT 0,
    stok INT NOT NULL DEFAULT 0,
    barcode VARCHAR(120) DEFAULT '',
    store_id INT DEFAULT 1,
    created_at VARCHAR(40),
    updated_at VARCHAR(40)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(190) NOT NULL,
    telepon VARCHAR(40) DEFAULT '',
    alamat TEXT,
    store_id INT DEFAULT 1,
    created_at VARCHAR(40)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(190) NOT NULL,
    kontak VARCHAR(190) DEFAULT '',
    telepon VARCHAR(40) DEFAULT '',
    alamat TEXT,
    kategori VARCHAR(120) DEFAULT '',
    hutang INT DEFAULT 0,
    catatan TEXT,
    store_id INT DEFAULT 1,
    created_at VARCHAR(40),
    updated_at VARCHAR(40)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomor_transaksi VARCHAR(80) UNIQUE NOT NULL,
    pelanggan_id INT,
    user_id INT,
    total INT NOT NULL DEFAULT 0,
    subtotal INT NOT NULL DEFAULT 0,
    pajak INT NOT NULL DEFAULT 0,
    diskon INT NOT NULL DEFAULT 0,
    metode_pembayaran VARCHAR(40) DEFAULT 'TUNAI',
    status VARCHAR(40) DEFAULT 'SELESAI',
    catatan TEXT,
    store_id INT DEFAULT 1,
    created_at VARCHAR(40),
    updated_at VARCHAR(40)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaksi_id INT NOT NULL,
    menu_id INT NOT NULL,
    nama_menu VARCHAR(190) NOT NULL,
    harga_satuan INT NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    subtotal INT NOT NULL,
    created_at VARCHAR(40)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaksi_id INT NOT NULL,
    jumlah INT NOT NULL,
    metode VARCHAR(40) NOT NULL,
    referensi VARCHAR(190) DEFAULT '',
    created_at VARCHAR(40)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];

function getSchema(dialect) {
  return dialect === 'mysql' ? MYSQL_SCHEMA : SQLITE_SCHEMA;
}

module.exports = { TABLE_ORDER, getSchema };
