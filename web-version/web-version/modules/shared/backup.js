import { db } from '../../db/schema.js';

export const BACKUP_VERSION = 2;
export const BACKUP_TABLES = ['menu', 'customers', 'orders', 'ledger', 'suppliers', 'cashbook', 'settings'];

export async function exportAllData() {
  await db.open();
  const data = {};
  for (const table of BACKUP_TABLES) {
    data[table] = await db[table].toArray();
  }
  return {
    version: BACKUP_VERSION,
    app: 'M3 Chicken POS',
    exportedAt: new Date().toISOString(),
    data
  };
}

export function downloadBackupJson(payload) {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const filename = `M3Chicken_Backup_${dd}-${mm}-${yyyy}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return filename;
}

const REQUIRED_TABLES = ['menu', 'customers', 'orders', 'ledger'];

export function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('File backup tidak valid.');
  }
  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('Struktur data backup tidak ditemukan.');
  }
  for (const table of REQUIRED_TABLES) {
    if (!Array.isArray(payload.data[table])) {
      throw new Error(`Tabel "${table}" tidak ada atau bukan array.`);
    }
  }
  return true;
}

export async function importAllData(payload) {
  validateBackupPayload(payload);
  await db.open();
  const tablesPresent = BACKUP_TABLES.filter((t) => Array.isArray(payload.data[t]));
  await db.transaction('rw', tablesPresent, async () => {
    for (const table of tablesPresent) {
      await db[table].clear();
      const rows = payload.data[table];
      if (rows.length) {
        await db[table].bulkPut(rows);
      }
    }
  });
}
