// db/seed.js — default users & sample menu for M3 Chicken
import { db } from './schema.js';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function seedUsers() {
  const count = await db.users.count();
  if (count === 0) {
    await db.users.bulkAdd([
      {
        username: 'admin',
        password: await hashPassword('admin123'),
        role: 'owner',
        nama: 'Selino Anggri',
        telepon: '081373546317'
      },
      {
        username: 'kasir',
        password: await hashPassword('kasir123'),
        role: 'kasir',
        nama: 'Kasir M3',
        telepon: ''
      }
    ]);
  } else {
    const kasir = await db.users.where('username').equals('kasir').first();
    if (kasir && kasir.role !== 'kasir') {
      await db.users.update(kasir.id, { role: 'kasir', nama: kasir.nama || 'Kasir M3' });
    }
  }
}

export async function seedMenu() {
  const count = await db.menu.count();
  if (count === 0) {
    await db.menu.bulkAdd([
      { nama: 'Ayam Goreng', kategori: 'Ayam', harga: 35000, stok: 25, barcode: '' },
      { nama: 'Ayam Pedas', kategori: 'Ayam', harga: 38000, stok: 20, barcode: '' },
      { nama: 'Ayam Tepung', kategori: 'Ayam', harga: 32000, stok: 30, barcode: '' }
    ]);
  }
}

export async function seedCustomers() {
  const count = await db.customers.count();
  if (count === 0) {
    await db.customers.bulkAdd([
      { nama: 'Budi Santoso', telepon: '081234567801', alamat: 'Jl. Merdeka No. 12, OKU Timur' },
      { nama: 'Siti Rahayu', telepon: '081234567802', alamat: 'Jl. Pasar Raya Sidodadi' },
      { nama: 'Ahmad Wijaya', telepon: '081234567803', alamat: 'Desa Sidodadi, OKU Timur' },
      { nama: 'Dewi Lestari', telepon: '081234567804', alamat: 'Jl. Ahmad Yani No. 5' },
      { nama: 'Rudi Hartono', telepon: '081234567805', alamat: 'Komplek Pasar BK 9' },
      { nama: 'Maya Putri', telepon: '081234567806', alamat: 'Jl. Raya Martapura' }
    ]);
  }
}

export async function seedSuppliers() {
  const count = await db.suppliers.count();
  if (count === 0) {
    const now = new Date().toISOString();
    await db.suppliers.bulkAdd([
      {
        nama: 'UD Ayam Jaya',
        kontak: 'Pak Joko',
        telepon: '081298765401',
        alamat: 'Pasar Unggas OKU Timur',
        kategori: 'Ayam hidup',
        hutang: 1500000,
        catatan: 'Supplier utama ayam potong',
        createdAt: now,
        updatedAt: now
      },
      {
        nama: 'PT Ternak Makmur',
        kontak: 'Bu Ani',
        telepon: '081298765402',
        alamat: 'Jl. Industri Ternak No. 8',
        kategori: 'Pakan & bumbu',
        hutang: 750000,
        catatan: 'Kirim setiap Senin & Kamis',
        createdAt: now,
        updatedAt: now
      },
      {
        nama: 'CV Mitra Unggas',
        kontak: 'Hendra',
        telepon: '081298765403',
        alamat: 'Desa Sidodadi',
        kategori: 'Ayam hidup',
        hutang: 0,
        catatan: '',
        createdAt: now,
        updatedAt: now
      },
      {
        nama: 'Toko Pak Haji',
        kontak: 'Pak Haji',
        telepon: '081298765404',
        alamat: 'Pasar Sidodadi',
        kategori: 'Bumbu & minuman',
        hutang: 320000,
        catatan: 'Nota tempo 7 hari',
        createdAt: now,
        updatedAt: now
      },
      {
        nama: 'Supplier Andi',
        kontak: 'Andi',
        telepon: '081298765405',
        alamat: 'OKU Timur',
        kategori: 'Kemasan',
        hutang: 0,
        catatan: 'Plastik & tissue',
        createdAt: now,
        updatedAt: now
      }
    ]);
  }
}

async function runSeed() {
  try {
    await db.open();
    await seedUsers();
    await seedMenu();
    await seedCustomers();
    await seedSuppliers();
  } catch (err) {
    console.error('Seed gagal:', err);
  }
}

runSeed();
