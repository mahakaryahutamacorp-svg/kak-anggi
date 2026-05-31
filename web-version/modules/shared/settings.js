import { API_BASE } from '../../modules/shared/dataService.js';

export const DEFAULT_SETTINGS = {
  businessName: 'M3 Chicken',
  ownerName: 'Selino Anggri',
  phone: '081373546317',
  address: 'Jalan Pasar Raya Sidodadi BK 9, OKU Timur, Sumatera Selatan',
  receiptFooter: 'Terima kasih — Selamat menikmati!',
  lowStockThreshold: 5
};

let cache = null;

export async function loadSettings() {
  try {
    const settings = await fetch(`${API_BASE}/settings`).then(res => res.json());
    if (settings.error) throw new Error(settings.error);
    cache = { ...DEFAULT_SETTINGS, ...settings };
    return cache;
  } catch (err) {
    console.error('Error loading settings from API:', err);
    cache = { ...DEFAULT_SETTINGS }; // Fallback to default if API fails
    return cache;
  }
}

export function getCachedSettings() {
  return cache || { ...DEFAULT_SETTINGS };
}

export async function saveSettings(partial) {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan pengaturan');
    }
    cache = { ...cache, ...data }; // Update cache with saved settings
    return cache;
  } catch (err) {
    console.error('Error saving settings to API:', err);
    throw err; // Re-throw to propagate error to UI
  }
}
