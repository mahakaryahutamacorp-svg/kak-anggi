// [MULTI-STORE] dataService.js yang diadaptasi untuk API PHP murni (tanpa Dexie/offline mode)

export const API_BASE = window.location.origin + '/api'; // [MULTI-STORE] GANTI DENGAN URL API ANDA DI HOSTINGER

// Helper untuk mendapatkan token autentikasi (dari localStorage)
export function getAuthToken() {
  return localStorage.getItem('m3chicken_token') || '';
}

// Helper untuk membuat header otorisasi
export function authHeaders() {
  const token = getAuthToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

// Helper untuk request API
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

// --- Stores ---
export async function listStores() {
  return apiRequest('/stores');
}

export async function saveStore(payload, id = null) {
  if (id) {
    return apiRequest(`/stores/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  return apiRequest('/stores', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteStore(id) {
  return apiRequest(`/stores/${id}`, { method: 'DELETE' });
}

export async function setDefaultStore(id) {
  return apiRequest(`/stores/${id}/default`, { method: 'PUT' });
}

// [MULTI-STORE] Tracking toko aktif via localStorage (persisten antar sesi)
const CURRENT_STORE_KEY = 'm3chicken_store_id';

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

// --- Menu ---
export async function listMenu() {
  return apiRequest('/menu');
}

export async function saveMenu(payload, id = null) {
  if (id) {
    return apiRequest(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  return apiRequest('/menu', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteMenu(id) {
  return apiRequest(`/menu/${id}`, { method: 'DELETE' });
}

// --- Customers ---
export async function listCustomers() {
  return apiRequest('/customers');
}

export async function saveCustomer(payload, id = null) {
  if (id) {
    return apiRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  return apiRequest('/customers', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteCustomer(id) {
  return apiRequest(`/customers/${id}`, { method: 'DELETE' });
}

// --- Suppliers ---
export async function listSuppliers() {
  return apiRequest('/suppliers');
}

export async function saveSupplier(payload, id = null) {
  if (id) {
    return apiRequest(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  return apiRequest('/suppliers', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteSupplier(id) {
  return apiRequest(`/suppliers/${id}`, { method: 'DELETE' });
}

// --- Transactions (POS & History) ---
export async function createTransaction({ items, metodeBayar, diskon = 0, pelangganId = null }) {
  const storeId = getCurrentStoreId(); // [MULTI-STORE] toko aktif
  const body = {
    items: items.map((i) => ({ menu_id: i.id, qty: i.qty })),
    metode_pembayaran: PAYMENT_TO_API[metodeBayar] || 'TUNAI',
    diskon,
    pelanggan_id: pelangganId,
    store_id: storeId // [MULTI-STORE]
  };
  return apiRequest('/transactions', { method: 'POST', body: JSON.stringify(body) });
}

export async function listTransactions({ tanggal = '', limit = 100, storeId = null } = {}) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (tanggal) query.set('tanggal', tanggal);
  if (storeId) query.set('store_id', String(storeId)); // [MULTI-STORE] filter opsional
  const result = await apiRequest(`/transactions?${query}`);
  return (result.data || []).map(mapTransactionToOrder);
}

export async function getTransaction(id) {
  const tx = await apiRequest(`/transactions/${id}`);
  // Fetch items and payments for the transaction
  tx.items = await apiRequest(`/transactions/${id}/items`);
  tx.payments = await apiRequest(`/transactions/${id}/payments`);
  return mapTransactionToOrder(tx);
}

// --- Dashboard ---
export async function getDashboardData(lowStockThreshold = 5) {
  const storeId = getCurrentStoreId();
  const stats = await apiRequest(`/dashboard?store_id=${storeId}`);
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

// --- Settings ---
export async function loadSettings() {
  return apiRequest('/settings');
}

export async function saveSettings(partial) {
  return apiRequest('/settings', { method: 'PUT', body: JSON.stringify(partial) });
}

// --- Ledger ---
export async function listLedger() {
  const storeId = getCurrentStoreId();
  return apiRequest(`/ledger?store_id=${storeId}`);
}

export async function saveLedger(payload, id = null) {
  const storeId = getCurrentStoreId();
  payload.store_id = storeId; // Ensure store_id is sent
  if (id) {
    return apiRequest(`/ledger/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  return apiRequest('/ledger', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteLedger(id) {
  return apiRequest(`/ledger/${id}`, { method: 'DELETE' });
}

// --- Cashbook ---
export async function listCashbook() {
  const storeId = getCurrentStoreId();
  return apiRequest(`/cashbook?store_id=${storeId}`);
}

export async function saveCashbook(payload, id = null) {
  const storeId = getCurrentStoreId();
  payload.store_id = storeId;
  if (id) {
    return apiRequest(`/cashbook/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  return apiRequest('/cashbook', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteCashbook(id) {
  return apiRequest(`/cashbook/${id}`, { method: 'DELETE' });
}
