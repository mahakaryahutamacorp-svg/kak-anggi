import { db } from '../../db/schema.js';

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
  await db.open();
  const rows = await db.settings.toArray();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  cache = { ...DEFAULT_SETTINGS, ...map };
  return cache;
}

export function getCachedSettings() {
  return cache || { ...DEFAULT_SETTINGS };
}

export async function saveSettings(partial) {
  await db.open();
  const entries = Object.entries(partial);
  await db.transaction('rw', db.settings, async () => {
    for (const [key, value] of entries) {
      await db.settings.put({ key, value });
    }
  });
  await loadSettings();
  return cache;
}
