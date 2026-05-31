import { API_BASE } from '../shared/dataService.js'; // [MULTI-STORE] Ambil API_BASE dari dataService

const HEALTH_TIMEOUT_MS = 2000;
const LOGIN_TIMEOUT_MS = 6000;

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

export function loginForm() {
  return {
    username: '',
    password: '',
    error: '',
    info: 'Siap login — memeriksa server...',
    loading: false,
    backendOnline: false,
    authMode: 'api', // Always API mode for web version

    get buttonLabel() {
      return this.loading ? 'Memverifikasi...' : 'Login';
    },

    async checkBackend() {
      console.log('[M3 Login] Memeriksa ketersediaan backend:', API_BASE);
      this.backendOnline = false;
      this.info = 'Backend aktif — login via server MySQL.';

      try {
        const res = await fetchWithTimeout(
          `${API_BASE}/health`,
          { method: 'GET' },
          HEALTH_TIMEOUT_MS
        );
        if (res.ok) {
          this.backendOnline = true;
          console.log('[M3 Login] Backend ONLINE — mode API');
        } else {
          console.warn('[M3 Login] Backend merespons error HTTP:', res.status);
          this.info = 'Backend tidak merespons (status: ' + res.status + ').';
        }
      } catch (err) {
        console.warn('[M3 Login] Backend tidak terjangkau:', err.message);
        this.info = 'Backend tidak terjangkau — pastikan URL API benar.';
      }
    },

    async loginViaApi() {
      console.log('[M3 Login] → Login via API (MySQL backend)');
      const res = await fetchWithTimeout(
        `${API_BASE}/auth`,
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

    async submit() {
      console.log('[M3 Login] Tombol Login diklik — mode:', this.authMode);
      this.error = '';

      if (!this.username || !this.password) {
        this.error = 'Username dan password wajib diisi';
        return;
      }

      this.loading = true;

      try {
        await this.loginViaApi();
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
