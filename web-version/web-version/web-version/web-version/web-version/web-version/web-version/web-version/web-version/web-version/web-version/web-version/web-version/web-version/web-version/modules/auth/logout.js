import { API_BASE, getAuthToken } from './config.js';

export async function logout() {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      /* offline logout tetap lanjut */
    }
  }
  localStorage.removeItem('m3chicken_token');
  localStorage.removeItem('m3chicken_user');
  window.location.reload();
}
