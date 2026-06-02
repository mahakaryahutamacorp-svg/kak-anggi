import { API_BASE, authHeaders, getAuthToken } from '../auth/config.js';

// Backup database server (SQLite/MySQL) ke device lokal.
// Hanya tersedia saat aplikasi berjalan dalam mode API (token server, bukan offline).

export function canServerBackup() {
  const token = getAuthToken();
  return !!token && !token.startsWith('offline-');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function filenameFromResponse(res, fallback) {
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match ? match[1] : fallback;
}

async function downloadBackup(format) {
  if (!canServerBackup()) {
    throw new Error('Backup server hanya tersedia saat terhubung ke database server (mode online).');
  }
  const res = await fetch(`${API_BASE}/api/backup/${format}`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal mengunduh backup (${res.status})`);
  }
  const blob = await res.blob();
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = filenameFromResponse(res, `M3Chicken_Backup_${stamp}.${format}`);
  triggerDownload(blob, filename);
  return filename;
}

export function downloadServerBackupSql() {
  return downloadBackup('sql');
}

export function downloadServerBackupJson() {
  return downloadBackup('json');
}
