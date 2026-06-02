'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const { createDatabase } = require('./db');
const { buildJsonBackup, buildSqlBackup, backupFilename } = require('./db/backup');

const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, '..');

const db = createDatabase();
const sessions = new Map();

// --- Util ---
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function parseId(param) {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// --- Inisialisasi database (schema + migrasi + seed) ---
async function initDatabase() {
  await db.init();
  await runStoreMigrations();
  await seedStores();
  await seedCategories();
  await seedUsers();
  await seedMenu();
  await seedCustomers();
  await seedSuppliers();
}

// [MULTI-STORE] Migrasi additive khusus SQLite lama: tambah kolom store_id
// bila belum ada. Pada MySQL kolom store_id sudah ada di schema awal.
async function runStoreMigrations() {
  if (db.dialect !== 'sqlite') return;
  const targets = ['transactions', 'menu', 'customers', 'suppliers'];
  for (const table of targets) {
    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
      [table]
    );
    if (!tableExists) continue;
    const columns = await db.all(`PRAGMA table_info(${table})`);
    const hasStoreId = columns.some((col) => col.name === 'store_id');
    if (!hasStoreId) {
      await db.run(`ALTER TABLE ${table} ADD COLUMN store_id INTEGER DEFAULT 1`);
      console.log(`Database: kolom store_id ditambahkan ke ${table}`);
    }
  }
}

async function seedStores() {
  const row = await db.get('SELECT COUNT(*) AS total FROM stores');
  if (row.total === 0) {
    await db.run(
      'INSERT INTO stores (id, kode_toko, nama_toko, is_default, created_at) VALUES (?, ?, ?, ?, ?)',
      [1, 'TOKO-01', 'Toko Utama', 1, new Date().toISOString()]
    );
    console.log('Database: toko default berhasil di-seed');
  }
}

async function seedCategories() {
  const row = await db.get('SELECT COUNT(*) AS total FROM categories');
  if (row.total === 0) {
    const now = new Date().toISOString();
    const insert = (nama, deskripsi) =>
      db.run('INSERT INTO categories (nama, deskripsi, created_at) VALUES (?, ?, ?)', [
        nama,
        deskripsi,
        now
      ]);
    await insert('Ayam', 'Kategori produk ayam goreng dan rebus');
    await insert('Minuman', 'Kategori minuman (soft drink, jus, dsb)');
    await insert('Camilan', 'Kategori makanan camilan dan snack');
    await insert('Paket', 'Kategori paket bundel hemat');
    console.log('Database: kategori berhasil di-seed');
  }
}

async function seedUsers() {
  const row = await db.get('SELECT COUNT(*) AS total FROM users');
  if (row.total === 0) {
    await db.run(
      'INSERT INTO users (username, password, role, nama, telepon) VALUES (?, ?, ?, ?, ?)',
      ['admin', hashPassword('admin123'), 'owner', 'Selino Anggri', '081373546317']
    );
    await db.run(
      'INSERT INTO users (username, password, role, nama, telepon) VALUES (?, ?, ?, ?, ?)',
      ['kasir', hashPassword('kasir123'), 'kasir', 'Kasir M3', '']
    );
    console.log('Database: user default berhasil di-seed');
  } else {
    await db.run("UPDATE users SET role = 'kasir' WHERE username = 'kasir' AND role != 'kasir'");
  }
}

async function seedMenu() {
  const row = await db.get('SELECT COUNT(*) AS total FROM menu');
  if (row.total === 0) {
    const now = new Date().toISOString();
    const insert = (nama, kategori, kategoriId, harga, stok, barcode) =>
      db.run(
        'INSERT INTO menu (nama, kategori, kategori_id, harga, stok, barcode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [nama, kategori, kategoriId, harga, stok, barcode, now, now]
      );
    await insert('Ayam Goreng', 'Ayam', 1, 35000, 25, 'AYG001');
    await insert('Ayam Pedas', 'Ayam', 1, 38000, 20, 'AYP001');
    await insert('Ayam Tepung', 'Ayam', 1, 32000, 30, 'AYT001');
    await insert('Es Jeruk', 'Minuman', 2, 8000, 50, 'MIN001');
    await insert('Teh Tarik', 'Minuman', 2, 10000, 40, 'MIN002');
    await insert('Pisang Goreng', 'Camilan', 3, 12000, 35, 'CAM001');
    console.log('Database: sample menu berhasil di-seed');
  }
}

async function seedCustomers() {
  const row = await db.get('SELECT COUNT(*) AS total FROM customers');
  if (row.total === 0) {
    const now = new Date().toISOString();
    const samples = [
      ['Budi Santoso', '081234567801', 'Jl. Merdeka No. 12, OKU Timur'],
      ['Siti Rahayu', '081234567802', 'Jl. Pasar Raya Sidodadi'],
      ['Ahmad Wijaya', '081234567803', 'Desa Sidodadi, OKU Timur'],
      ['Dewi Lestari', '081234567804', 'Jl. Ahmad Yani No. 5'],
      ['Rudi Hartono', '081234567805', 'Komplek Pasar BK 9'],
      ['Maya Putri', '081234567806', 'Jl. Raya Martapura']
    ];
    for (const [nama, telepon, alamat] of samples) {
      await db.run(
        'INSERT INTO customers (nama, telepon, alamat, created_at) VALUES (?, ?, ?, ?)',
        [nama, telepon, alamat, now]
      );
    }
    console.log('Database: sample pelanggan berhasil di-seed');
  }
}

async function seedSuppliers() {
  const row = await db.get('SELECT COUNT(*) AS total FROM suppliers');
  if (row.total === 0) {
    const now = new Date().toISOString();
    const samples = [
      ['UD Ayam Jaya', 'Pak Joko', '081298765401', 'Pasar Unggas OKU Timur', 'Ayam hidup', 1500000, 'Supplier utama ayam potong'],
      ['PT Ternak Makmur', 'Bu Ani', '081298765402', 'Jl. Industri Ternak No. 8', 'Pakan & bumbu', 750000, 'Kirim setiap Senin & Kamis'],
      ['CV Mitra Unggas', 'Hendra', '081298765403', 'Desa Sidodadi', 'Ayam hidup', 0, ''],
      ['Toko Pak Haji', 'Pak Haji', '081298765404', 'Pasar Sidodadi', 'Bumbu & minuman', 320000, 'Nota tempo 7 hari'],
      ['Supplier Andi', 'Andi', '081298765405', 'OKU Timur', 'Kemasan', 0, 'Plastik & tissue']
    ];
    for (const [nama, kontak, telepon, alamat, kategori, hutang, catatan] of samples) {
      await db.run(
        `INSERT INTO suppliers (nama, kontak, telepon, alamat, kategori, hutang, catatan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nama, kontak, telepon, alamat, kategori, hutang, catatan, now, now]
      );
    }
    console.log('Database: sample supplier berhasil di-seed');
  }
}

// --- Middleware autentikasi ---
async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Token tidak ditemukan' });
    }
    const session = sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      sessions.delete(token);
      return res.status(401).json({ error: 'Sesi kedaluwarsa, silakan login ulang' });
    }
    const user = await db.get(
      'SELECT id, username, role, nama, telepon FROM users WHERE id = ?',
      [session.userId]
    );
    if (!user) {
      return res.status(401).json({ error: 'User tidak ditemukan' });
    }
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

function ownerOnly(req, res, next) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Hanya owner yang dapat mengakses fitur ini' });
  }
  next();
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'M3 Chicken API', database: db.dialect });
});

// --- Auth ---
app.post(
  '/api/auth/login',
  ah(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }
    const user = await db.get(
      'SELECT id, username, password, role, nama, telepon FROM users WHERE username = ?',
      [username.trim()]
    );
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, {
      userId: user.id,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        nama: user.nama,
        telepon: user.telepon
      }
    });
  })
);

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  sessions.delete(req.token);
  res.json({ ok: true });
});

// --- CRUD Menu ---
app.get(
  '/api/menu',
  authMiddleware,
  ah(async (_req, res) => {
    res.json(await db.all('SELECT * FROM menu ORDER BY nama'));
  })
);

app.get(
  '/api/menu/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const row = await db.get('SELECT * FROM menu WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Menu tidak ditemukan' });
    res.json(row);
  })
);

app.post(
  '/api/menu',
  authMiddleware,
  ah(async (req, res) => {
    const { nama, kategori, harga, stok, barcode } = req.body || {};
    if (!nama || !kategori) {
      return res.status(400).json({ error: 'Nama dan kategori wajib diisi' });
    }
    const result = await db.run(
      'INSERT INTO menu (nama, kategori, harga, stok, barcode) VALUES (?, ?, ?, ?, ?)',
      [nama.trim(), kategori.trim(), Number(harga) || 0, Number(stok) || 0, barcode || '']
    );
    res.status(201).json(await db.get('SELECT * FROM menu WHERE id = ?', [result.lastInsertRowid]));
  })
);

app.put(
  '/api/menu/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const existing = await db.get('SELECT id FROM menu WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Menu tidak ditemukan' });
    const { nama, kategori, harga, stok, barcode } = req.body || {};
    if (!nama || !kategori) {
      return res.status(400).json({ error: 'Nama dan kategori wajib diisi' });
    }
    await db.run(
      'UPDATE menu SET nama = ?, kategori = ?, harga = ?, stok = ?, barcode = ? WHERE id = ?',
      [nama.trim(), kategori.trim(), Number(harga) || 0, Number(stok) || 0, barcode || '', id]
    );
    res.json(await db.get('SELECT * FROM menu WHERE id = ?', [id]));
  })
);

app.delete(
  '/api/menu/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const result = await db.run('DELETE FROM menu WHERE id = ?', [id]);
    if (!result.changes) return res.status(404).json({ error: 'Menu tidak ditemukan' });
    res.json({ ok: true });
  })
);

// --- CRUD Pelanggan ---
app.get(
  '/api/customers',
  authMiddleware,
  ah(async (_req, res) => {
    res.json(await db.all('SELECT * FROM customers ORDER BY nama'));
  })
);

app.get(
  '/api/customers/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const row = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
    res.json(row);
  })
);

app.post(
  '/api/customers',
  authMiddleware,
  ah(async (req, res) => {
    const { nama, telepon, alamat } = req.body || {};
    if (!nama) return res.status(400).json({ error: 'Nama wajib diisi' });
    const result = await db.run(
      'INSERT INTO customers (nama, telepon, alamat, created_at) VALUES (?, ?, ?, ?)',
      [nama.trim(), telepon || '', alamat || '', new Date().toISOString()]
    );
    res
      .status(201)
      .json(await db.get('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]));
  })
);

app.put(
  '/api/customers/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const existing = await db.get('SELECT id FROM customers WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
    const { nama, telepon, alamat } = req.body || {};
    if (!nama) return res.status(400).json({ error: 'Nama wajib diisi' });
    await db.run('UPDATE customers SET nama = ?, telepon = ?, alamat = ? WHERE id = ?', [
      nama.trim(),
      telepon || '',
      alamat || '',
      id
    ]);
    res.json(await db.get('SELECT * FROM customers WHERE id = ?', [id]));
  })
);

app.delete(
  '/api/customers/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const result = await db.run('DELETE FROM customers WHERE id = ?', [id]);
    if (!result.changes) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
    res.json({ ok: true });
  })
);

// --- CRUD Supplier ---
app.get(
  '/api/suppliers',
  authMiddleware,
  ah(async (_req, res) => {
    res.json(await db.all('SELECT * FROM suppliers ORDER BY nama'));
  })
);

app.get(
  '/api/suppliers/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const row = await db.get('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Supplier tidak ditemukan' });
    res.json(row);
  })
);

app.post(
  '/api/suppliers',
  authMiddleware,
  ah(async (req, res) => {
    const { nama, kontak, telepon, alamat, kategori, hutang, catatan } = req.body || {};
    if (!nama) return res.status(400).json({ error: 'Nama wajib diisi' });
    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO suppliers (nama, kontak, telepon, alamat, kategori, hutang, catatan, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nama.trim(),
        kontak || '',
        telepon || '',
        alamat || '',
        kategori || '',
        Number(hutang) || 0,
        catatan || '',
        now,
        now
      ]
    );
    res
      .status(201)
      .json(await db.get('SELECT * FROM suppliers WHERE id = ?', [result.lastInsertRowid]));
  })
);

app.put(
  '/api/suppliers/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const existing = await db.get('SELECT id FROM suppliers WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Supplier tidak ditemukan' });
    const { nama, kontak, telepon, alamat, kategori, hutang, catatan } = req.body || {};
    if (!nama) return res.status(400).json({ error: 'Nama wajib diisi' });
    await db.run(
      `UPDATE suppliers
       SET nama = ?, kontak = ?, telepon = ?, alamat = ?, kategori = ?, hutang = ?, catatan = ?, updated_at = ?
       WHERE id = ?`,
      [
        nama.trim(),
        kontak || '',
        telepon || '',
        alamat || '',
        kategori || '',
        Number(hutang) || 0,
        catatan || '',
        new Date().toISOString(),
        id
      ]
    );
    res.json(await db.get('SELECT * FROM suppliers WHERE id = ?', [id]));
  })
);

app.delete(
  '/api/suppliers/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const result = await db.run('DELETE FROM suppliers WHERE id = ?', [id]);
    if (!result.changes) return res.status(404).json({ error: 'Supplier tidak ditemukan' });
    res.json({ ok: true });
  })
);

// --- CRUD Categories ---
app.get(
  '/api/categories',
  authMiddleware,
  ah(async (_req, res) => {
    res.json(await db.all('SELECT * FROM categories ORDER BY nama'));
  })
);

app.get(
  '/api/categories/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const row = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    res.json(row);
  })
);

app.post(
  '/api/categories',
  authMiddleware,
  ah(async (req, res) => {
    const { nama, deskripsi } = req.body || {};
    if (!nama) return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    try {
      const result = await db.run(
        'INSERT INTO categories (nama, deskripsi, created_at) VALUES (?, ?, ?)',
        [nama.trim(), deskripsi || '', new Date().toISOString()]
      );
      res
        .status(201)
        .json(await db.get('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]));
    } catch (e) {
      if (db.isUniqueError(e)) return res.status(409).json({ error: 'Kategori sudah ada' });
      throw e;
    }
  })
);

app.put(
  '/api/categories/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const existing = await db.get('SELECT id FROM categories WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    const { nama, deskripsi } = req.body || {};
    if (!nama) return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    try {
      await db.run('UPDATE categories SET nama = ?, deskripsi = ? WHERE id = ?', [
        nama.trim(),
        deskripsi || '',
        id
      ]);
      res.json(await db.get('SELECT * FROM categories WHERE id = ?', [id]));
    } catch (e) {
      if (db.isUniqueError(e)) return res.status(409).json({ error: 'Kategori sudah ada' });
      throw e;
    }
  })
);

app.delete(
  '/api/categories/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const result = await db.run('DELETE FROM categories WHERE id = ?', [id]);
    if (!result.changes) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
    res.json({ ok: true });
  })
);

// [MULTI-STORE] --- CRUD Stores ---
app.get(
  '/api/stores',
  authMiddleware,
  ah(async (_req, res) => {
    res.json(await db.all('SELECT * FROM stores ORDER BY is_default DESC, nama_toko'));
  })
);

app.get(
  '/api/stores/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const row = await db.get('SELECT * FROM stores WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Toko tidak ditemukan' });
    res.json(row);
  })
);

app.post(
  '/api/stores',
  authMiddleware,
  ah(async (req, res) => {
    const { kode_toko, nama_toko, alamat, telepon, is_active } = req.body || {};
    if (!kode_toko || !nama_toko) {
      return res.status(400).json({ error: 'Kode toko dan nama toko wajib diisi' });
    }
    try {
      const result = await db.run(
        `INSERT INTO stores (kode_toko, nama_toko, alamat, telepon, is_active, is_default, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [
          kode_toko.trim(),
          nama_toko.trim(),
          alamat || '',
          telepon || '',
          is_active === undefined ? 1 : Number(is_active),
          new Date().toISOString()
        ]
      );
      res
        .status(201)
        .json(await db.get('SELECT * FROM stores WHERE id = ?', [result.lastInsertRowid]));
    } catch (e) {
      if (db.isUniqueError(e)) return res.status(409).json({ error: 'Kode toko sudah digunakan' });
      throw e;
    }
  })
);

app.put(
  '/api/stores/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const existing = await db.get('SELECT id FROM stores WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Toko tidak ditemukan' });
    const { kode_toko, nama_toko, alamat, telepon, is_active } = req.body || {};
    if (!kode_toko || !nama_toko) {
      return res.status(400).json({ error: 'Kode toko dan nama toko wajib diisi' });
    }
    try {
      await db.run(
        `UPDATE stores
         SET kode_toko = ?, nama_toko = ?, alamat = ?, telepon = ?, is_active = ?
         WHERE id = ?`,
        [
          kode_toko.trim(),
          nama_toko.trim(),
          alamat || '',
          telepon || '',
          is_active === undefined ? 1 : Number(is_active),
          id
        ]
      );
      res.json(await db.get('SELECT * FROM stores WHERE id = ?', [id]));
    } catch (e) {
      if (db.isUniqueError(e)) return res.status(409).json({ error: 'Kode toko sudah digunakan' });
      throw e;
    }
  })
);

app.delete(
  '/api/stores/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const store = await db.get('SELECT * FROM stores WHERE id = ?', [id]);
    if (!store) return res.status(404).json({ error: 'Toko tidak ditemukan' });
    if (store.is_default) {
      return res.status(409).json({ error: 'Toko default tidak dapat dihapus' });
    }
    const linked = await db.get(
      'SELECT COUNT(*) AS total FROM transactions WHERE store_id = ?',
      [id]
    );
    if (linked.total > 0) {
      return res.status(409).json({ error: 'Toko memiliki transaksi terkait, tidak dapat dihapus' });
    }
    await db.run('DELETE FROM stores WHERE id = ?', [id]);
    res.json({ ok: true });
  })
);

app.put(
  '/api/stores/:id/default',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const existing = await db.get('SELECT id FROM stores WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Toko tidak ditemukan' });
    await db.tx(async (t) => {
      await t.run('UPDATE stores SET is_default = 0');
      await t.run('UPDATE stores SET is_default = 1, is_active = 1 WHERE id = ?', [id]);
    });
    res.json(await db.get('SELECT * FROM stores WHERE id = ?', [id]));
  })
);

// --- CRUD Transactions (POS Checkout) ---
app.get(
  '/api/transactions',
  authMiddleware,
  ah(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;
    const tanggal = typeof req.query.tanggal === 'string' ? req.query.tanggal.trim() : '';
    const storeId = parseId(req.query.store_id);

    const conditions = ["t.status != 'BATAL'"];
    const filterParams = [];
    if (tanggal) {
      conditions.push(`${db.dateExpr('t.created_at')} = ?`);
      filterParams.push(tanggal);
    }
    if (storeId) {
      conditions.push('t.store_id = ?');
      filterParams.push(storeId);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const transactions = await db.all(
      `SELECT t.*,
              c.nama as customer_nama,
              u.nama as user_nama,
              COUNT(ti.id) as item_count
       FROM transactions t
       LEFT JOIN customers c ON t.pelanggan_id = c.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN transaction_items ti ON t.id = ti.transaksi_id
       ${whereClause}
       GROUP BY t.id
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...filterParams, limit, offset]
    );

    const total = await db.get(
      `SELECT COUNT(*) as count FROM transactions t ${whereClause}`,
      filterParams
    );

    res.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total: total.count,
        pages: Math.ceil(total.count / limit) || 1
      }
    });
  })
);

app.get(
  '/api/transactions/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const transaction = await db.get(
      `SELECT t.*, c.nama as customer_nama, u.nama as user_nama
       FROM transactions t
       LEFT JOIN customers c ON t.pelanggan_id = c.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [id]
    );
    if (!transaction) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    const items = await db.all('SELECT * FROM transaction_items WHERE transaksi_id = ?', [id]);
    const payments = await db.all('SELECT * FROM payments WHERE transaksi_id = ?', [id]);
    res.json({ ...transaction, items, payments });
  })
);

app.post(
  '/api/transactions',
  authMiddleware,
  ah(async (req, res) => {
    const { pelanggan_id, items, metode_pembayaran, diskon, catatan, store_id } = req.body || {};
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Minimal harus ada 1 item' });
    }
    for (const item of items) {
      if (!item.menu_id || !item.qty || item.qty <= 0) {
        return res.status(400).json({ error: 'Item tidak valid' });
      }
    }

    const now = new Date().toISOString();
    const nomorTransaksi = `TRX-${Date.now()}`;
    const storeId = parseId(store_id) || 1;
    const diskonAmount = Math.max(0, parseInt(diskon) || 0);
    const metode = metode_pembayaran || 'TUNAI';

    try {
      const payload = await db.tx(async (t) => {
        let subtotal = 0;
        const resolved = [];
        for (const item of items) {
          const menu = await t.get('SELECT nama, harga FROM menu WHERE id = ?', [item.menu_id]);
          if (!menu) {
            throw new HttpError(404, `Menu ID ${item.menu_id} tidak ditemukan`);
          }
          const lineSubtotal = menu.harga * item.qty;
          subtotal += lineSubtotal;
          resolved.push({ ...item, nama: menu.nama, harga: menu.harga, lineSubtotal });
        }

        const total = subtotal - diskonAmount;

        const txResult = await t.run(
          `INSERT INTO transactions (nomor_transaksi, pelanggan_id, user_id, subtotal, total, diskon, metode_pembayaran, catatan, store_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nomorTransaksi,
            pelanggan_id || null,
            req.user.id,
            subtotal,
            total,
            diskonAmount,
            metode,
            catatan || '',
            storeId,
            now,
            now
          ]
        );
        const transaksiId = txResult.lastInsertRowid;

        for (const item of resolved) {
          await t.run(
            `INSERT INTO transaction_items (transaksi_id, menu_id, nama_menu, harga_satuan, qty, subtotal, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [transaksiId, item.menu_id, item.nama, item.harga, item.qty, item.lineSubtotal, now]
          );
          await t.run('UPDATE menu SET stok = stok - ? WHERE id = ?', [item.qty, item.menu_id]);
        }

        await t.run(
          'INSERT INTO payments (transaksi_id, jumlah, metode, created_at) VALUES (?, ?, ?, ?)',
          [transaksiId, total, metode, now]
        );

        return {
          id: transaksiId,
          nomor_transaksi: nomorTransaksi,
          subtotal,
          diskon: diskonAmount,
          total,
          metode_pembayaran: metode,
          items_count: items.length,
          created_at: now
        };
      });

      res.status(201).json(payload);
    } catch (e) {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
      console.error('Error creating transaction:', e);
      res.status(500).json({ error: 'Error membuat transaksi: ' + e.message });
    }
  })
);

app.put(
  '/api/transactions/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const existing = await db.get('SELECT status FROM transactions WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    const { status, catatan } = req.body || {};
    const now = new Date().toISOString();
    if (status) {
      await db.run('UPDATE transactions SET status = ?, updated_at = ? WHERE id = ?', [status, now, id]);
    }
    if (catatan !== undefined) {
      await db.run('UPDATE transactions SET catatan = ?, updated_at = ? WHERE id = ?', [catatan, now, id]);
    }
    res.json(await db.get('SELECT * FROM transactions WHERE id = ?', [id]));
  })
);

app.delete(
  '/api/transactions/:id',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    const existing = await db.get('SELECT id FROM transactions WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    await db.run('UPDATE transactions SET status = ?, updated_at = ? WHERE id = ?', [
      'BATAL',
      new Date().toISOString(),
      id
    ]);
    res.json({ ok: true });
  })
);

app.get(
  '/api/transactions/:id/items',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    res.json(await db.all('SELECT * FROM transaction_items WHERE transaksi_id = ?', [id]));
  })
);

app.get(
  '/api/payments',
  authMiddleware,
  ah(async (_req, res) => {
    res.json(
      await db.all(
        `SELECT p.*, t.nomor_transaksi
         FROM payments p
         JOIN transactions t ON p.transaksi_id = t.id
         ORDER BY p.created_at DESC`
      )
    );
  })
);

app.get(
  '/api/transactions/:id/payments',
  authMiddleware,
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID tidak valid' });
    res.json(await db.all('SELECT * FROM payments WHERE transaksi_id = ?', [id]));
  })
);

// --- Dashboard Stats ---
app.get(
  '/api/dashboard/stats',
  authMiddleware,
  ah(async (_req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const monthPrefix = today.slice(0, 7);

    const todayStats = await db.get(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
       FROM transactions
       WHERE status != 'BATAL' AND ${db.dateExpr('created_at')} = ?`,
      [today]
    );

    const monthStats = await db.get(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
       FROM transactions
       WHERE status != 'BATAL' AND ${db.monthExpr('created_at')} = ?`,
      [monthPrefix]
    );

    const topProducts = await db.all(
      `SELECT ti.menu_id, ti.nama_menu, SUM(ti.qty) as total_qty, SUM(ti.subtotal) as revenue
       FROM transaction_items ti
       JOIN transactions t ON ti.transaksi_id = t.id
       WHERE ${db.dateExpr('t.created_at')} = ? AND t.status != 'BATAL'
       GROUP BY ti.menu_id, ti.nama_menu
       ORDER BY total_qty DESC
       LIMIT 5`,
      [today]
    );

    const lowStock = await db.all(
      `SELECT id, nama, kategori, stok, harga FROM menu WHERE stok <= 10 ORDER BY stok ASC`
    );

    const recentTransactions = await db.all(
      `SELECT t.id, t.nomor_transaksi, t.total, t.metode_pembayaran, t.created_at,
              u.nama as user_nama,
              COUNT(ti.id) as item_count
       FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN transaction_items ti ON t.id = ti.transaksi_id
       WHERE t.status != 'BATAL'
       GROUP BY t.id
       ORDER BY t.created_at DESC
       LIMIT 5`
    );

    const customerCount = (await db.get('SELECT COUNT(*) as count FROM customers')).count;
    const menuCount = (await db.get('SELECT COUNT(*) as count FROM menu')).count;
    const supplierStats = await db.get(
      'SELECT COUNT(*) as count, COALESCE(SUM(hutang), 0) as totalHutang FROM suppliers'
    );

    res.json({
      today: todayStats,
      month: monthStats,
      topProducts,
      lowStock,
      lowStockThreshold: 10,
      recentTransactions,
      counts: {
        customers: customerCount,
        menu: menuCount,
        suppliers: supplierStats.count,
        totalHutang: supplierStats.totalHutang
      },
      cashbookSaldo: 0
    });
  })
);

// --- Backup Database (owner only) ---
app.get(
  '/api/backup/json',
  authMiddleware,
  ownerOnly,
  ah(async (_req, res) => {
    const payload = await buildJsonBackup(db);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${backupFilename('json')}"`);
    res.send(JSON.stringify(payload, null, 2));
  })
);

app.get(
  '/api/backup/sql',
  authMiddleware,
  ownerOnly,
  ah(async (_req, res) => {
    const sql = await buildSqlBackup(db);
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${backupFilename('sql')}"`);
    res.send(sql);
  })
);

// --- Static frontend ---
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  let filePath = path.join(
    FRONTEND_DIR,
    decodeURIComponent(req.path === '/' ? '/index.html' : req.path)
  );

  if (!filePath.startsWith(FRONTEND_DIR)) {
    return res.status(403).send('Forbidden');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(FRONTEND_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  res.type(MIME_TYPES[ext] || 'application/octet-stream');
  res.sendFile(filePath);
});

// --- Error handler global ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Terjadi kesalahan server' });
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`M3 Chicken POS berjalan di http://localhost:${PORT}`);
      console.log(`Database aktif: ${db.label}`);
    });
  })
  .catch((err) => {
    console.error('Gagal inisialisasi database:', err);
    process.exit(1);
  });
