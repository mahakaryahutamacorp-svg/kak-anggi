import { getCurrentUser } from '../auth/guard.js';
import { listMenu, saveMenu, deleteMenu } from '../shared/dataService.js';

export function menuModule() {
  return {
    menuList: [],
    form: { id: null, nama: '', harga: '', stok: '', kategori: 'Ayam', barcode: '' },
    isOwner: false,
    error: '',

    async init() {
      this.isOwner = getCurrentUser()?.role === 'owner';
      await this.loadMenu();
    },

    async loadMenu() {
      try {
        this.menuList = await listMenu();
      } catch (err) {
        this.error = err.message;
        this.menuList = [];
      }
    },

    resetForm() {
      this.form = { id: null, nama: '', harga: '', stok: '', kategori: 'Ayam', barcode: '' };
      this.error = '';
    },

    async saveMenu() {
      if (!this.form.nama || !this.form.kategori) return;
      this.error = '';
      const payload = {
        nama: this.form.nama.trim(),
        kategori: this.form.kategori,
        harga: Number(this.form.harga) || 0,
        stok: Number(this.form.stok) || 0,
        barcode: this.form.barcode || ''
      };
      try {
        await saveMenu(payload, this.form.id || null);
        this.resetForm();
        await this.loadMenu();
      } catch (err) {
        this.error = err.message || 'Gagal menyimpan menu';
      }
    },

    editMenu(item) {
      this.form = { ...item };
      this.error = '';
    },

    async deleteMenu(id) {
      if (!confirm('Hapus menu ini?')) return;
      try {
        await deleteMenu(id);
        await this.loadMenu();
      } catch (err) {
        this.error = err.message || 'Gagal menghapus menu';
      }
    }
  };
}
