import { API_BASE, authHeaders, getAuthToken } from '../auth/config.js';
import { db } from '../../db/schema.js';

export function isApiMode() {
  const token = getAuthToken();
  return !!token && !token.startsWith('offline-');
}

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Permintaan gagal (${res.status})`);
  }
  return data;
}

// [MULTI-STORE] Kunci localStorage untuk menyimpan toko aktif (persisten antar sesi)
const CURRENT_STORE_KEY = 'm3chicken_store_id';

const PAYMENT_TO_API = { tunai: 'TUNAI', qris: 'QRIS', transfer: 'TRANSFER' };
const PAYMENT_FROM_API = { TUNAI: 'tunai', QRIS: 'qris', TRANSFER: 'transfer' };

export function mapTransactionToOrder(tx) {
  const created = tx.created_at || '';
  return {
    id: tx.id,
    nomor: tx.nomor_transaksi,
    tanggal: created.slice(0, 10),
    createdAt: created,
    total: tx.total,
    kasir: tx.user_nama || '',
    kasirNama: tx.user_nama || '',
    metodeBayar: PAYMENT_FROM_API[tx.metode_pembayaran] || (tx.metode_pembayaran || 'tunai').toLowerCase(),
    items: (tx.items || []).map((row) => ({
      id: row.id,
      nama: row.nama_menu,
      harga: row.harga_satuan,
      qty: row.qty
    })),
    itemCount: tx.item_count
  };
}

// --- Menu ---
export async function listMenu() {
  if (isApiMode()) {
    return apiRequest('/api/menu');
  }
  await db.open();
  return db.menu.toArray();
}

export async function saveMenu(payload, id = null) {
  if (isApiMode()) {
    if (id) {
      return apiRequest(`/api/menu/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    return apiRequest('/api/menu', { method: 'POST', body: JSON.stringify(payload) });
  }
  await db.open();
  if (id) {
    await db.menu.update(id, payload);
    return db.menu.get(id);
  }
  const newId = await db.menu.add(payload);
  return db.menu.get(newId);
}

export async function deleteMenu(id) {
  if (isApiMode()) {
    return apiRequest(`/api/menu/${id}`, { method: 'DELETE' });
  }
  await db.open();
  await db.menu.delete(id);
}

// --- Customers ---
export async function listCustomers() {
  if (isApiMode()) {
    return apiRequest('/api/customers');
  }
  await db.open();
  return db.customers.toArray();
}

export async function saveCustomer(payload, id = null) {
  if (isApiMode()) {
    if (id) {
      return apiRequest(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    return apiRequest('/api/customers', { method: 'POST', body: JSON.stringify(payload) });
  }
  await db.open();
  if (id) {
    await db.customers.update(id, payload);
    return db.customers.get(id);
  }
  const newId = await db.customers.add(payload);
  return db.customers.get(newId);
}

export async function deleteCustomer(id) {
  if (isApiMode()) {
    return apiRequest(`/api/customers/${id}`, { method: 'DELETE' });
  }
  await db.open();
  await db.customers.delete(id);
}

// --- Suppliers ---
export async function listSuppliers() {
  if (isApiMode()) {
    return apiRequest('/api/suppliers');
  }
  await db.open();
  return db.suppliers.orderBy('nama').toArray();
}

export async function saveSupplier(payload, id = null) {
  if (isApiMode()) {
    if (id) {
      return apiRequest(`/api/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    return apiRequest('/api/suppliers', { method: 'POST', body: JSON.stringify(payload) });
  }
  await db.open();
  if (id) {
    await db.suppliers.update(id, payload);
    return db.suppliers.get(id);
  }
  const newId = await db.suppliers.add(payload);
  return db.suppliers.get(newId);
}

export async function deleteSupplier(id) {
  if (isApiMode()) {
    return apiRequest(`/api/suppliers/${id}`, { method: 'DELETE' });
  }
  await db.open();
  await db.suppliers.delete(id);
}

// [MULTI-STORE] --- Stores ---
export async function listStores() {
  if (isApiMode()) {
    return apiRequest('/api/stores');
  }
  await db.open();
  return db.stores.orderBy('id').toArray();
}

export async function saveStore(payload, id = null) {
  if (isApiMode()) {
    if (id) {
      return apiRequest(`/api/stores/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    return apiRequest('/api/stores', { method: 'POST', body: JSON.stringify(payload) });
  }
  await db.open();
  if (id) {
    await db.stores.update(id, payload);
    return db.stores.get(id);
  }
  const newId = await db.stores.add({
    ...payload,
    is_default: 0,
    created_at: new Date().toISOString()
  });
  return db.stores.get(newId);
}

export async function deleteStore(id) {
  if (isApiMode()) {
    return apiRequest(`/api/stores/${id}`, { method: 'DELETE' });
  }
  await db.open();
  const store = await db.stores.get(id);
  if (store?.is_default) {
    throw new Error('Toko default tidak dapat dihapus');
  }
  const linked = await db.orders.where('store_id').equals(id).count();
  if (linked > 0) {
    throw new Error('Toko memiliki transaksi terkait, tidak dapat dihapus');
  }
  await db.stores.delete(id);
}

export async function setDefaultStore(id) {
  if (isApiMode()) {
    return apiRequest(`/api/stores/${id}/default`, { method: 'PUT' });
  }
  await db.open();
  await db.transaction('rw', db.stores, async () => {
    await db.stores.toCollection().modify({ is_default: 0 });
    await db.stores.update(id, { is_default: 1, is_active: 1 });
  });
  return db.stores.get(id);
}

// [MULTI-STORE] Tracking toko aktif via localStorage (persisten antar sesi)
export function getCurrentStoreId() {
  const raw = localStorage.getItem(CURRENT_STORE_KEY);
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : 1;
}

export function setCurrentStore(id) {
  const storeId = Number(id);
  if (Number.isInteger(storeId) && storeId > 0) {
    localStorage.setItem(CURRENT_STORE_KEY, String(storeId));
  }
  return getCurrentStoreId();
}

export async function getCurrentStore() {
  const id = getCurrentStoreId();
  const stores = await listStores();
  return stores.find((s) => Number(s.id) === id) || stores.find((s) => s.is_default) || stores[0] || null;
}

// --- Transactions (POS & History) ---
export async function createTransaction({ items, metodeBayar, diskon = 0, pelangganId = null }) {
  const storeId = getCurrentStoreId(); // [MULTI-STORE] toko aktif
  if (isApiMode()) {
    const body = {
      items: items.map((i) => ({ menu_id: i.id, qty: i.qty })),
      metode_pembayaran: PAYMENT_TO_API[metodeBayar] || 'TUNAI',
      diskon,
      pelanggan_id: pelangganId,
      store_id: storeId // [MULTI-STORE]
    };
    return apiRequest('/api/transactions', { method: 'POST', body: JSON.stringify(body) });
  }

  const user = JSON.parse(localStorage.getItem('m3chicken_user') || 'null');
  const tanggal = new Date().toISOString().slice(0, 10);
  const total = items.reduce((s, i) => s + Number(i.harga) * Number(i.qty), 0);

  const orderId = await db.orders.add({
    tanggal,
    items,
    total,
    kasir: user?.username || '',
    kasirNama: user?.nama || '',
    pelangganId,
    metodeBayar,
    store_id: storeId, // [MULTI-STORE]
    createdAt: new Date().toISOString()
  });

  await db.ledger.add({
    tanggal,
    tipe: 'cash-in',
    deskripsi: `Penjualan POS #${orderId}`,
    nominal: total,
    kategori: 'Penjualan',
    orderId,
    kasir: user?.username || ''
  });

  for (const item of items) {
    const menu = await db.menu.get(item.id);
    if (menu && menu.stok !== undefined) {
      await db.menu.update(item.id, { stok: Math.max(0, menu.stok - item.qty) });
    }
  }

  return { id: orderId, total };
}

export async function listTransactions({ tanggal = '', limit = 100, storeId = null } = {}) {
  if (isApiMode()) {
    const query = new URLSearchParams({ limit: String(limit) });
    if (tanggal) query.set('tanggal', tanggal);
    if (storeId) query.set('store_id', String(storeId)); // [MULTI-STORE] filter opsional
    const result = await apiRequest(`/api/transactions?${query}`);
    return (result.data || []).map(mapTransactionToOrder);
  }

  await db.open();
  const all = await db.orders.orderBy('tanggal').reverse().toArray();
  let rows = tanggal ? all.filter((o) => o.tanggal === tanggal) : all;
  // [MULTI-STORE] filter opsional; data lama tanpa store_id dianggap toko 1
  if (storeId) {
    rows = rows.filter((o) => Number(o.store_id || 1) === Number(storeId));
  }
  return rows;
}

export async function getTransaction(id) {
  if (isApiMode()) {
    const tx = await apiRequest(`/api/transactions/${id}`);
    return mapTransactionToOrder(tx);
  }
  await db.open();
  return db.orders.get(id);
}

// --- Dashboard ---
export async function getDashboardData(lowStockThreshold = 5) {
  if (isApiMode()) {
    const stats = await apiRequest('/api/dashboard/stats');
    const threshold = stats.lowStockThreshold ?? lowStockThreshold;
    const lowStock = (stats.lowStock || []).filter((m) => Number(m.stok) <= threshold);
    const recentOrders = (stats.recentTransactions || []).map(mapTransactionToOrder);

    return {
      stats: {
        todaySales: stats.today?.revenue ?? 0,
        todayOrders: stats.today?.count ?? 0,
        monthSales: stats.month?.revenue ?? 0,
        monthOrders: stats.month?.count ?? 0,
        totalCustomers: stats.counts?.customers ?? 0,
        totalMenu: stats.counts?.menu ?? 0,
        totalSuppliers: stats.counts?.suppliers ?? 0,
        totalHutang: stats.counts?.totalHutang ?? 0,
        cashbookSaldo: stats.cashbookSaldo ?? 0
      },
      lowStock,
      recentOrders
    };
  }

  await db.open();
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const [orders, customers, menu, suppliers, cashbook] = await Promise.all([
    db.orders.toArray(),
    db.customers.count(),
    db.menu.toArray(),
    db.suppliers.toArray(),
    db.cashbook.toArray()
  ]);

  const todayOrders = orders.filter((o) => o.tanggal === today);
  const monthOrders = orders.filter((o) => (o.tanggal || '').startsWith(month));

  const lowStock = menu
    .filter((m) => Number(m.stok) <= lowStockThreshold)
    .sort((a, b) => Number(a.stok) - Number(b.stok));

  const recentOrders = orders
    .slice()
    .sort((a, b) => (b.createdAt || b.tanggal).localeCompare(a.createdAt || a.tanggal))
    .slice(0, 5);

  const cashIn = cashbook
    .filter((c) => c.tipe === 'cash-in')
    .reduce((s, c) => s + Number(c.nominal), 0);
  const cashOut = cashbook
    .filter((c) => c.tipe === 'cash-out')
    .reduce((s, c) => s + Number(c.nominal), 0);

  return {
    stats: {
      todaySales: todayOrders.reduce((s, o) => s + Number(o.total), 0),
      todayOrders: todayOrders.length,
      monthSales: monthOrders.reduce((s, o) => s + Number(o.total), 0),
      monthOrders: monthOrders.length,
      totalCustomers: customers,
      totalMenu: menu.length,
      totalSuppliers: suppliers.length,
      totalHutang: suppliers.reduce((s, sup) => s + Number(sup.hutang || 0), 0),
      cashbookSaldo: cashIn - cashOut
    },
    lowStock,
    recentOrders
  };
}

export async function reduceMenuStockOffline(items) {
  if (isApiMode()) return;
  await db.open();
  for (const item of items) {
    const menu = await db.menu.get(item.id);
    if (menu && menu.stok !== undefined) {
      await db.menu.update(item.id, { stok: Math.max(0, menu.stok - item.qty) });
    }
  }
}
