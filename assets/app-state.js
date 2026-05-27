import { loginForm } from '../modules/auth/login.js';

export function appState() {
  const auth = window.m3chickenAuth;

  const shell = {
    user: auth.getCurrentUser(),
    showLogin: !auth.isLoggedIn(),
    page: 'dashboard',
    ownerPages: ['ledger', 'supplier', 'cashbook', 'settings'],

    get isOwner() {
      return this.user && this.user.role === 'owner';
    },
    get isKasir() {
      return this.user && this.user.role === 'kasir';
    },

    logout() {
      auth.logout();
    },

    goPage(name) {
      if (this.ownerPages.includes(name) && !this.isOwner) return;
      this.page = name;
    }
  };

  return Object.assign(shell, loginForm());
}
