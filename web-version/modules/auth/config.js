export const API_BASE =
  (typeof window !== 'undefined' && window.M3_API_BASE_URL) ||
  'http://localhost:3000';

export function getAuthToken() {
  return localStorage.getItem('m3chicken_token') || '';
}

export function authHeaders() {
  const token = getAuthToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}
