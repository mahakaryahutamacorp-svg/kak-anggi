// [MULTI-STORE] Modul UI manajemen multi-toko
import { getCurrentUser } from '../auth/guard.js';
import {
  listStores,
  saveStore,
  deleteStore,
  setDefaultStore,
  getCurrentStoreId,
  setCurrentStore
} from '../shared/dataService.js';

export function storeModule() {
  return {
    storeList: [],
    form: {
      id: null,
      kode_toko: '',
      nama_toko: '',
      alamat: '',
      telepon: '',
      is_active: 1
    },
    search: '',
    isOwner: false,
    currentStoreId: 1,
    error: '',

    async init() {
      this.isOwner = getCurrentUser()?.role === 'owner';
      this.currentStoreId = getCurrentStoreId();
      await this.loadStores();
    },

    get filteredStores() {
      const q = this.search.trim().toLowerCase();
      if (!q) return this.storeList;
      return this.storeList.filter(
        (s) =>
          s.nama_toko.toLowerCase().includes(q) ||
          (s.kode_toko || '').toLowerCase().includes(q) ||
          (s.alamat || '').toLowerCase().includes(q)
      );
    },

    async loadStores() {
      try {
        this.storeList = await listStores();
      } catch (err) {
        this.error = err.message;
        this.storeList = [];
      }
    },

    resetForm() {
      this.form = {
        id: null,
        kode_toko: '',
        nama_toko: '',
        alamat: '',
        telepon: '',
        is_active: 1
      };
      this.error = '';
    },

    async saveStore() {
      if (!this.form.kode_toko || !this.form.nama_toko) return;
      this.error = '';
      const payload = {
        kode_toko: this.form.kode_toko.trim(),
        nama_toko: this.form.nama_toko.trim(),
        alamat: this.form.alamat || '',
        telepon: this.form.telepon || '',
        is_active: Number(this.form.is_active) ? 1 : 0
      };
      try {
        await saveStore(payload, this.form.id || null);
        this.resetForm();
        await this.loadStores();
      } catch (err) {
        this.error = err.message || 'Gagal menyimpan toko';
      }
    },

    editStore(item) {
      this.form = {
        id: item.id,
        kode_toko: item.kode_toko,
        nama_toko: item.nama_toko,
        alamat: item.alamat || '',
        telepon: item.telepon || '',
        is_active: item.is_active ?? 1
      };
      this.error = '';
    },

    async deleteStore(id) {
      if (!confirm('Hapus data toko ini?')) return;
      this.error = '';
      try {
        await deleteStore(id);
        await this.loadStores();
      } catch (err) {
        this.error = err.message || 'Gagal menghapus toko';
      }
    },

    async setDefault(id) {
      this.error = '';
      try {
        await setDefaultStore(id);
        await this.loadStores();
      } catch (err) {
        this.error = err.message || 'Gagal mengatur toko default';
      }
    },

    selectStore(id) {
      this.currentStoreId = setCurrentStore(id);
      // Sinkronkan indikator toko aktif di header
      window.dispatchEvent(new CustomEvent('m3:store-changed', { detail: { id: this.currentStoreId } }));
    }
  };
}
