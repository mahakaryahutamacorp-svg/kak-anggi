import { API_BASE } from './config.js';
import { db } from '../../db/schema.js';

const HEALTH_TIMEOUT_MS = 2000;
const LOGIN_TIMEOUT_MS = 6000;

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function saveSession(user, token) {
  localStorage.setItem('m3chicken_token', token);
  localStorage.setItem(
    'm3chicken_user',
    JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role,
      nama: user.nama,
      telepon: user.telepon || ''
    })
  );
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Koneksi timeout');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function loginForm() {
  return {
    username: '',
    password: '',
    error: '',
    info: 'Siap login — memeriksa server...',
    loading: false,
    backendOnline: false,
    authMode: 'offline',

    get buttonLabel() {
      return this.loading ? 'Memverifikasi...' : 'Login';
    },

    async checkBackend() {
      console.log('[M3 Login] Memeriksa ketersediaan backend:', API_BASE);
      this.authMode = 'offline';
      this.backendOnline = false;
      this.info = 'Mode offline — bisa login via database lokal.';

      try {
        const res = await fetchWithTimeout(
          `${API_BASE}/api/health`,
          { method: 'GET' },
          HEALTH_TIMEOUT_MS
        );
        if (res.ok) {
          this.backendOnline = true;
          this.authMode = 'api';
          this.info = 'Backend aktif — login via server SQLite.';
          console.log('[M3 Login] Backend ONLINE — mode API');
        } else {
          console.warn('[M3 Login] Backend merespons error HTTP:', res.status);
        }
      } catch (err) {
        console.warn('[M3 Login] Backend tidak terjangkau:', err.message, '— mode offline');
      }
    },

    async loginViaApi() {
      console.log('[M3 Login] → Login via API (SQLite backend)');
      const res = await fetchWithTimeout(
        `${API_BASE}/api/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: this.username.trim(),
            password: this.password
          })
        },
        LOGIN_TIMEOUT_MS
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Login API gagal (${res.status})`);
      }
      saveSession(data.user, data.token);
      console.log('[M3 Login] ✓ Berhasil via API — role:', data.user.role);
    },

    async loginViaDexie() {
      console.log('[M3 Login] → Login via Dexie (IndexedDB lokal)');
      if (!window.Dexie) {
        throw new Error('Dexie belum dimuat. Restart aplikasi.');
      }
      await db.open();
      const hash = await hashPassword(this.password);
      const user = await db.users.where('username').equals(this.username.trim()).first();
      if (!user || user.password !== hash) {
        throw new Error('Username atau password salah.');
      }
      saveSession(user, `offline-${user.id}`);
      console.log('[M3 Login] ✓ Berhasil via Dexie — role:', user.role);
    },

    async submit() {
      console.log('[M3 Login] Tombol Login diklik — mode:', this.authMode);
      this.error = '';

      if (!this.username || !this.password) {
        this.error = 'Username dan password wajib diisi';
        return;
      }

      this.loading = true;

      try {
        if (this.authMode === 'api') {
          try {
            await this.loginViaApi();
            window.location.reload();
            return;
          } catch (apiErr) {
            console.warn('[M3 Login] API gagal, lanjut Dexie:', apiErr.message);
          }
        }

        await this.loginViaDexie();
        window.location.reload();
      } catch (err) {
        console.error('[M3 Login] ✗ Login gagal:', err);
        this.error = err.message || 'Login gagal';
      } finally {
        this.loading = false;
        console.log('[M3 Login] Proses login selesai (loading=false)');
      }
    }
  };
}
