import { API_BASE, getAuthToken } from '../shared/dataService.js'; // [MULTI-STORE] Ambil API_BASE & getAuthToken dari dataService

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('m3chicken_user'));
  } catch {
    return null;
  }
}

export function requireRole(role) {
  const user = getCurrentUser();
  return user && user.role === role;
}

export function isLoggedIn() {
  return !!getCurrentUser() && !!getAuthToken();
}

export async function verifySession() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      localStorage.removeItem('m3chicken_token');
      localStorage.removeItem('m3chicken_user');
      return null;
    }
    const data = await res.json();
    localStorage.setItem('m3chicken_user', JSON.stringify(data.user));
    return data.user;
  } catch {
    localStorage.removeItem('m3chicken_token');
    localStorage.removeItem('m3chicken_user');
    return null;
  }
}
