import { loginForm } from '../modules/auth/login.js';
// [MULTI-STORE] Helper toko aktif untuk indikator/switcher di header
import { listStores, getCurrentStoreId, setCurrentStore } from '../modules/shared/dataService.js';

export function appState() {
  const auth = window.m3chickenAuth;

  const shell = {
    user: auth.getCurrentUser(),
    showLogin: !auth.isLoggedIn(),
    page: 'dashboard',
    // [MULTI-STORE] 'store' hanya untuk owner
    ownerPages: ['ledger', 'supplier', 'cashbook', 'settings', 'store'],

    // [MULTI-STORE] State toko aktif di header
    storeOptions: [],
    activeStoreId: getCurrentStoreId(),

    get isOwner() {
      return this.user && this.user.role === 'owner';
    },
    get isKasir() {
      return this.user && this.user.role === 'kasir';
    },

    // [MULTI-STORE] Nama toko aktif untuk ditampilkan di header
    get activeStoreName() {
      const store = this.storeOptions.find((s) => Number(s.id) === Number(this.activeStoreId));
      return store ? store.nama_toko : '';
    },

    // [MULTI-STORE] Muat daftar toko + dengarkan perubahan dari modul Multi Toko
    async initStores() {
      if (!this.user) return;
      try {
        this.storeOptions = await listStores();
        this.activeStoreId = getCurrentStoreId();
      } catch (err) {
        console.warn('[M3] Gagal memuat toko:', err);
      }
      window.addEventListener('m3:store-changed', (e) => {
        this.activeStoreId = Number(e.detail?.id) || getCurrentStoreId();
      });
    },

    // [MULTI-STORE] Ganti toko aktif dari header switcher
    changeActiveStore(id) {
      this.activeStoreId = setCurrentStore(id);
      window.dispatchEvent(new CustomEvent('m3:store-changed', { detail: { id: this.activeStoreId } }));
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
