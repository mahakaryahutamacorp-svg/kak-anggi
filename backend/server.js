const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'm3chicken.db');
const FRONTEND_DIR = path.join(__dirname, '..');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
const sessions = new Map();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      nama TEXT NOT NULL,
      telepon TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT UNIQUE NOT NULL,
      deskripsi TEXT DEFAULT '',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      kategori TEXT NOT NULL DEFAULT 'Ayam',
      kategori_id INTEGER REFERENCES categories(id),
      harga INTEGER NOT NULL DEFAULT 0,
      stok INTEGER NOT NULL DEFAULT 0,
      barcode TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      telepon TEXT DEFAULT '',
      alamat TEXT DEFAULT '',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      kontak TEXT DEFAULT '',
      telepon TEXT DEFAULT '',
      alamat TEXT DEFAULT '',
      kategori TEXT DEFAULT '',
      hutang INTEGER DEFAULT 0,
      catatan TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor_transaksi TEXT UNIQUE NOT NULL,
      pelanggan_id INTEGER REFERENCES customers(id),
      user_id INTEGER REFERENCES users(id),
      total INTEGER NOT NULL DEFAULT 0,
      subtotal INTEGER NOT NULL DEFAULT 0,
      pajak INTEGER NOT NULL DEFAULT 0,
      diskon INTEGER NOT NULL DEFAULT 0,
      metode_pembayaran TEXT DEFAULT 'TUNAI',
      status TEXT DEFAULT 'SELESAI',
      catatan TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaksi_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      menu_id INTEGER NOT NULL REFERENCES menu(id),
      nama_menu TEXT NOT NULL,
      harga_satuan INTEGER NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      subtotal INTEGER NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaksi_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      jumlah INTEGER NOT NULL,
      metode TEXT NOT NULL,
      referensi TEXT DEFAULT '',
      created_at TEXT
    );
  `);

  seedCategories();
  seedUsers();
  seedMenu();
  seedCustomers();
  seedSuppliers();
}

function seedCategories() {
  const count = db.prepare('SELECT COUNT(*) AS total FROM categories').get().total;
  if (count === 0) {
    const now = new Date().toISOString();
    const insert = db.prepare(
      'INSERT INTO categories (nama, deskripsi, created_at) VALUES (?, ?, ?)'
    );
    insert.run('Ayam', 'Kategori produk ayam goreng dan rebus', now);
    insert.run('Minuman', 'Kategori minuman (soft drink, jus, dsb)', now);
    insert.run('Camilan', 'Kategori makanan camilan dan snack', now);
    insert.run('Paket', 'Kategori paket bundel hemat', now);
    console.log('Database: kategori berhasil di-seed');
  }
}

function seedUsers() {
  const count = db.prepare('SELECT COUNT(*) AS total FROM users').get().total;
  if (count === 0) {
    const insert = db.prepare(
      'INSERT INTO users (username, password, role, nama, telepon) VALUES (?, ?, ?, ?, ?)'
    );
    insert.run('admin', hashPassword('admin123'), 'owner', 'Selino Anggri', '081373546317');
    insert.run('kasir', hashPassword('kasir123'), 'kasir', 'Kasir M3', '');
    console.log('Database: user default berhasil di-seed');
  } else {
    db.prepare("UPDATE users SET role = 'kasir' WHERE username = 'kasir' AND role != 'kasir'").run();
  }
}

function seedMenu() {
  const count = db.prepare('SELECT COUNT(*) AS total FROM menu').get().total;
  if (count === 0) {
    const now = new Date().toISOString();
    const insert = db.prepare(
      'INSERT INTO menu (nama, kategori, kategori_id, harga, stok, barcode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insert.run('Ayam Goreng', 'Ayam', 1, 35000, 25, 'AYG001', now, now);
    insert.run('Ayam Pedas', 'Ayam', 1, 38000, 20, 'AYP001', now, now);
    insert.run('Ayam Tepung', 'Ayam', 1, 32000, 30, 'AYT001', now, now);
    insert.run('Es Jeruk', 'Minuman', 2, 8000, 50, 'MIN001', now, now);
    insert.run('Teh Tarik', 'Minuman', 2, 10000, 40, 'MIN002', now, now);
    insert.run('Pisang Goreng', 'Camilan', 3, 12000, 35, 'CAM001', now, now);
    console.log('Database: sample menu berhasil di-seed');
  }
}

function seedCustomers() {
  const count = db.prepare('SELECT COUNT(*) AS total FROM customers').get().total;
  if (count === 0) {
    const now = new Date().toISOString();
    const insert = db.prepare(
      'INSERT INTO customers (nama, telepon, alamat, created_at) VALUES (?, ?, ?, ?)'
    );
    const samples = [
      ['Budi Santoso', '081234567801', 'Jl. Merdeka No. 12, OKU Timur', now],
      ['Siti Rahayu', '081234567802', 'Jl. Pasar Raya Sidodadi', now],
      ['Ahmad Wijaya', '081234567803', 'Desa Sidodadi, OKU Timur', now],
      ['Dewi Lestari', '081234567804', 'Jl. Ahmad Yani No. 5', now],
      ['Rudi Hartono', '081234567805', 'Komplek Pasar BK 9', now],
      ['Maya Putri', '081234567806', 'Jl. Raya Martapura', now]
    ];
    for (const row of samples) insert.run(...row);
    console.log('Database: sample pelanggan berhasil di-seed');
  }
}

function seedSuppliers() {
  const count = db.prepare('SELECT COUNT(*) AS total FROM suppliers').get().total;
  if (count === 0) {
    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO suppliers (nama, kontak, telepon, alamat, kategori, hutang, catatan, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const samples = [
      ['UD Ayam Jaya', 'Pak Joko', '081298765401', 'Pasar Unggas OKU Timur', 'Ayam hidup', 1500000, 'Supplier utama ayam potong', now, now],
      ['PT Ternak Makmur', 'Bu Ani', '081298765402', 'Jl. Industri Ternak No. 8', 'Pakan & bumbu', 750000, 'Kirim setiap Senin & Kamis', now, now],
      ['CV Mitra Unggas', 'Hendra', '081298765403', 'Desa Sidodadi', 'Ayam hidup', 0, '', now, now],
      ['Toko Pak Haji', 'Pak Haji', '081298765404', 'Pasar Sidodadi', 'Bumbu & minuman', 320000, 'Nota tempo 7 hari', now, now],
      ['Supplier Andi', 'Andi', '081298765405', 'OKU Timur', 'Kemasan', 0, 'Plastik & tissue', now, now]
    ];
    for (const row of samples) insert.run(...row);
    console.log('Database: sample supplier berhasil di-seed');
  }
}

function parseId(param) {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function authMiddleware(req, res, next) {
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
  const user = db.prepare('SELECT id, username, role, nama, telepon FROM users WHERE id = ?').get(session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User tidak ditemukan' });
  }
  req.user = user;
  req.token = token;
  next();
}

initDatabase();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'M3 Chicken API', database: 'sqlite' });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  const user = db
    .prepare('SELECT id, username, password, role, nama, telepon FROM users WHERE username = ?')
    .get(username.trim());

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
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  sessions.delete(req.token);
  res.json({ ok: true });
});

// --- CRUD Menu ---
app.get('/api/menu', authMiddleware, (_req, res) => {
  res.json(db.prepare('SELECT * FROM menu ORDER BY nama').all());
});

app.get('/api/menu/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  const row = db.prepare('SELECT * FROM menu WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Menu tidak ditemukan' });
  res.json(row);
});

app.post('/api/menu', authMiddleware, (req, res) => {
  const { nama, kategori, harga, stok, barcode } = req.body || {};
  if (!nama || !kategori) {
    return res.status(400).json({ error: 'Nama dan kategori wajib diisi' });
  }
  const result = db
    .prepare(
      'INSERT INTO menu (nama, kategori, harga, stok, barcode) VALUES (?, ?, ?, ?, ?)'
    )
    .run(nama.trim(), kategori.trim(), Number(harga) || 0, Number(stok) || 0, barcode || '');
  res.status(201).json(db.prepare('SELECT * FROM menu WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/menu/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  const existing = db.prepare('SELECT id FROM menu WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Menu tidak ditemukan' });
  const { nama, kategori, harga, stok, barcode } = req.body || {};
  if (!nama || !kategori) {
    return res.status(400).json({ error: 'Nama dan kategori wajib diisi' });
  }
  db.prepare(
    'UPDATE menu SET nama = ?, kategori = ?, harga = ?, stok = ?, barcode = ? WHERE id = ?'
  ).run(nama.trim(), kategori.trim(), Number(harga) || 0, Number(stok) || 0, barcode || '', id);
  res.json(db.prepare('SELECT * FROM menu WHERE id = ?').get(id));
});

app.delete('/api/menu/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  const result = db.prepare('DELETE FROM menu WHERE id = ?').run(id);
  if (!result.changes) return res.status(404).json({ error: 'Menu tidak ditemukan' });
  res.json({ ok: true });
});

// --- CRUD Pelanggan ---
app.get('/api/customers', authMiddleware, (_req, res) => {
  res.json(db.prepare('SELECT * FROM customers ORDER BY nama').all());
});

app.get('/api/customers/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
  res.json(row);
});

app.post('/api/customers', authMiddleware, (req, res) => {
  const { nama, telepon, alamat } = req.body || {};
  if (!nama) return res.status(400).json({ error: 'Nama wajib diisi' });
  const result = db
    .prepare('INSERT INTO customers (nama, telepon, alamat) VALUES (?, ?, ?)')
    .run(nama.trim(), telepon || '', alamat || '');
  res.status(201).json(db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/customers/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
  const { nama, telepon, alamat } = req.body || {};
  if (!nama) return res.status(400).json({ error: 'Nama wajib diisi' });
  db.prepare('UPDATE customers SET nama = ?, telepon = ?, alamat = ? WHERE id = ?').run(
    nama.trim(),
    telepon || '',
    alamat || '',
    id
  );
  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(id));
});

app.delete('/api/customers/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  const result = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  if (!result.changes) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
  res.json({ ok: true });
});

// --- CRUD Supplier ---
app.get('/api/suppliers', authMiddleware, (_req, res) => {
  res.json(db.prepare('SELECT * FROM suppliers ORDER BY nama').all());
});

app.get('/api/suppliers/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Supplier tidak ditemukan' });
  res.json(row);
});

app.post('/api/suppliers', authMiddleware, (req, res) => {
  const { nama, kontak, telepon, alamat, kategori, hutang, catatan } = req.body || {};
  if (!nama) return res.status(400).json({ error: 'Nama wajib diisi' });
  const now = new Date().toISOString();
  const result = db
    .prepare(`
      INSERT INTO suppliers (nama, kontak, telepon, alamat, kategori, hutang, catatan, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      nama.trim(),
      kontak || '',
      telepon || '',
      alamat || '',
      kategori || '',
      Number(hutang) || 0,
      catatan || '',
      now,
      now
    );
  res.status(201).json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/suppliers/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  const existing = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Supplier tidak ditemukan' });
  const { nama, kontak, telepon, alamat, kategori, hutang, catatan } = req.body || {};
  if (!nama) return res.status(400).json({ error: 'Nama wajib diisi' });
  db.prepare(`
    UPDATE suppliers
    SET nama = ?, kontak = ?, telepon = ?, alamat = ?, kategori = ?, hutang = ?, catatan = ?, updated_at = ?
    WHERE id = ?
  `).run(
    nama.trim(),
    kontak || '',
    telepon || '',
    alamat || '',
    kategori || '',
    Number(hutang) || 0,
    catatan || '',
    new Date().toISOString(),
    id
  );
  res.json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id));
});

app.delete('/api/suppliers/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  const result = db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  if (!result.changes) return res.status(404).json({ error: 'Supplier tidak ditemukan' });
  res.json({ ok: true });
});

// --- CRUD Categories ---
app.get('/api/categories', authMiddleware, (_req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY nama').all());
});

app.get('/api/categories/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  res.json(row);
});

app.post('/api/categories', authMiddleware, (req, res) => {
  const { nama, deskripsi } = req.body || {};
  if (!nama) return res.status(400).json({ error: 'Nama kategori wajib diisi' });
  try {
    const now = new Date().toISOString();
    const result = db.prepare(
      'INSERT INTO categories (nama, deskripsi, created_at) VALUES (?, ?, ?)'
    ).run(nama.trim(), deskripsi || '', now);
    res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid));
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Kategori sudah ada' });
    } else {
      res.status(500).json({ error: 'Error membuat kategori' });
    }
  }
});

app.put('/api/categories/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  const { nama, deskripsi } = req.body || {};
  if (!nama) return res.status(400).json({ error: 'Nama kategori wajib diisi' });
  try {
    db.prepare('UPDATE categories SET nama = ?, deskripsi = ? WHERE id = ?').run(
      nama.trim(),
      deskripsi || '',
      id
    );
    res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Kategori sudah ada' });
    } else {
      res.status(500).json({ error: 'Error mengupdate kategori' });
    }
  }
});

app.delete('/api/categories/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (!result.changes) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  res.json({ ok: true });
});

// --- CRUD Transactions (POS Checkout) ---
app.get('/api/transactions', authMiddleware, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;
  const tanggal = typeof req.query.tanggal === 'string' ? req.query.tanggal.trim() : '';

  const whereClause = tanggal
    ? "WHERE DATE(t.created_at) = ? AND t.status != 'BATAL'"
    : "WHERE t.status != 'BATAL'";
  const params = tanggal ? [tanggal, limit, offset] : [limit, offset];

  const transactions = db.prepare(`
    SELECT t.*, 
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
    LIMIT ? OFFSET ?
  `).all(...params);

  const countQuery = tanggal
    ? db.prepare("SELECT COUNT(*) as count FROM transactions t WHERE DATE(t.created_at) = ? AND t.status != 'BATAL'")
    : db.prepare("SELECT COUNT(*) as count FROM transactions t WHERE t.status != 'BATAL'");
  const total = tanggal ? countQuery.get(tanggal) : countQuery.get();

  res.json({
    data: transactions,
    pagination: {
      page,
      limit,
      total: total.count,
      pages: Math.ceil(total.count / limit) || 1
    }
  });
});

app.get('/api/transactions/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  
  const transaction = db.prepare(`
    SELECT t.*, 
           c.nama as customer_nama,
           u.nama as user_nama
    FROM transactions t
    LEFT JOIN customers c ON t.pelanggan_id = c.id
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `).get(id);
  
  if (!transaction) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  
  const items = db.prepare('SELECT * FROM transaction_items WHERE transaksi_id = ?').all(id);
  const payments = db.prepare('SELECT * FROM payments WHERE transaksi_id = ?').all(id);
  
  res.json({ ...transaction, items, payments });
});

// Create Transaction (POS Checkout)
app.post('/api/transactions', authMiddleware, (req, res) => {
  const { pelanggan_id, items, metode_pembayaran, diskon, catatan } = req.body || {};
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Minimal harus ada 1 item' });
  }

  try {
    const now = new Date().toISOString();
    const nomorTransaksi = `TRX-${Date.now()}`;
    
    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      if (!item.menu_id || !item.qty || item.qty <= 0) {
        return res.status(400).json({ error: 'Item tidak valid' });
      }
      const menu = db.prepare('SELECT harga FROM menu WHERE id = ?').get(item.menu_id);
      if (!menu) {
        return res.status(404).json({ error: `Menu ID ${item.menu_id} tidak ditemukan` });
      }
      subtotal += menu.harga * item.qty;
    }

    const diskonAmount = Math.max(0, parseInt(diskon) || 0);
    const total = subtotal - diskonAmount;

    // Insert transaction
    const txResult = db.prepare(`
      INSERT INTO transactions (nomor_transaksi, pelanggan_id, user_id, subtotal, total, diskon, metode_pembayaran, catatan, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nomorTransaksi,
      pelanggan_id || null,
      req.user.id,
      subtotal,
      total,
      diskonAmount,
      metode_pembayaran || 'TUNAI',
      catatan || '',
      now,
      now
    );

    const transaksiId = txResult.lastInsertRowid;

    // Insert transaction items & update stock
    const itemInsert = db.prepare(`
      INSERT INTO transaction_items (transaksi_id, menu_id, nama_menu, harga_satuan, qty, subtotal, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      const menu = db.prepare('SELECT nama, harga, stok FROM menu WHERE id = ?').get(item.menu_id);
      const itemSubtotal = menu.harga * item.qty;
      
      itemInsert.run(
        transaksiId,
        item.menu_id,
        menu.nama,
        menu.harga,
        item.qty,
        itemSubtotal,
        now
      );

      // Update stock (reduce)
      db.prepare('UPDATE menu SET stok = stok - ? WHERE id = ?').run(item.qty, item.menu_id);
    }

    // Insert payment record
    db.prepare(`
      INSERT INTO payments (transaksi_id, jumlah, metode, created_at)
      VALUES (?, ?, ?, ?)
    `).run(transaksiId, total, metode_pembayaran || 'TUNAI', now);

    res.status(201).json({
      id: transaksiId,
      nomor_transaksi: nomorTransaksi,
      subtotal,
      diskon: diskonAmount,
      total,
      metode_pembayaran,
      items_count: items.length,
      created_at: now
    });
  } catch (e) {
    console.error('Error creating transaction:', e);
    res.status(500).json({ error: 'Error membuat transaksi: ' + e.message });
  }
});

app.put('/api/transactions/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  
  const existing = db.prepare('SELECT status FROM transactions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  
  const { status, catatan } = req.body || {};
  const now = new Date().toISOString();
  
  if (status) {
    db.prepare('UPDATE transactions SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
  }
  if (catatan !== undefined) {
    db.prepare('UPDATE transactions SET catatan = ?, updated_at = ? WHERE id = ?').run(catatan, now, id);
  }
  
  res.json(db.prepare('SELECT * FROM transactions WHERE id = ?').get(id));
});

app.delete('/api/transactions/:id', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  
  // This is a soft delete scenario - typically not recommended for POS
  // Instead, we just mark as cancelled
  const existing = db.prepare('SELECT id FROM transactions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  
  db.prepare('UPDATE transactions SET status = ? WHERE id = ?').run('BATAL', new Date().toISOString());
  res.json({ ok: true });
});

// --- GET Transaction Items ---
app.get('/api/transactions/:id/items', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  
  const items = db.prepare('SELECT * FROM transaction_items WHERE transaksi_id = ?').all(id);
  res.json(items);
});

// --- GET Payments ---
app.get('/api/payments', authMiddleware, (req, res) => {
  const payments = db.prepare(`
    SELECT p.*, t.nomor_transaksi 
    FROM payments p
    JOIN transactions t ON p.transaksi_id = t.id
    ORDER BY p.created_at DESC
  `).all();
  res.json(payments);
});

app.get('/api/transactions/:id/payments', authMiddleware, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID tidak valid' });
  
  const payments = db.prepare('SELECT * FROM payments WHERE transaksi_id = ?').all(id);
  res.json(payments);
});

// --- Dashboard Stats ---
app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const monthPrefix = today.slice(0, 7);

  const todayStats = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
    FROM transactions
    WHERE status != 'BATAL' AND DATE(created_at) = ?
  `).get(today);

  const monthStats = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
    FROM transactions
    WHERE status != 'BATAL' AND strftime('%Y-%m', created_at) = ?
  `).get(monthPrefix);

  const topProducts = db.prepare(`
    SELECT ti.menu_id, ti.nama_menu, SUM(ti.qty) as total_qty, SUM(ti.subtotal) as revenue
    FROM transaction_items ti
    JOIN transactions t ON ti.transaksi_id = t.id
    WHERE DATE(t.created_at) = ? AND t.status != 'BATAL'
    GROUP BY ti.menu_id
    ORDER BY total_qty DESC
    LIMIT 5
  `).all(today);

  const lowStock = db.prepare(`
    SELECT id, nama, kategori, stok, harga
    FROM menu
    WHERE stok <= 10
    ORDER BY stok ASC
  `).all();

  const recentTransactions = db.prepare(`
    SELECT t.id, t.nomor_transaksi, t.total, t.metode_pembayaran, t.created_at,
           u.nama as user_nama,
           COUNT(ti.id) as item_count
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN transaction_items ti ON t.id = ti.transaksi_id
    WHERE t.status != 'BATAL'
    GROUP BY t.id
    ORDER BY t.created_at DESC
    LIMIT 5
  `).all();

  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  const menuCount = db.prepare('SELECT COUNT(*) as count FROM menu').get().count;
  const supplierStats = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(hutang), 0) as totalHutang FROM suppliers
  `).get();

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
});

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

app.listen(PORT, () => {
  console.log(`M3 Chicken POS berjalan di http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
